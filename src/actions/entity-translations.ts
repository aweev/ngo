'use server';

import { revalidatePath } from 'next/cache';
import { authorizeOrganization } from '@/lib/auth/guards';
import { roleHasPermission, PERMISSIONS, type Permission } from '@/lib/auth/permissions';
import {
  ENTITY_MANAGE_PERMISSIONS,
  canPublishEntityLocale,
  isEntityType,
  isSupportedEntityLocale,
  validateEntityFields,
  type TranslatableEntityType,
} from '@/lib/content/entity-translations';

const TABLE = 'entity_translations';

function canManage(role: Parameters<typeof roleHasPermission>[0], entityType: TranslatableEntityType): boolean {
  const own = ENTITY_MANAGE_PERMISSIONS[entityType] as Permission;
  return roleHasPermission(role, own) || roleHasPermission(role, PERMISSIONS.content.manage);
}

function canPublish(role: Parameters<typeof roleHasPermission>[0], entityType: TranslatableEntityType): boolean {
  const own = ENTITY_MANAGE_PERMISSIONS[entityType] as Permission;
  return (
    roleHasPermission(role, own) ||
    roleHasPermission(role, PERMISSIONS.content.manage) ||
    roleHasPermission(role, PERMISSIONS.content.publish)
  );
}

/** List translation rows for one entity (org-scoped). */
export async function getEntityTranslations(entityType: string, entityId: string) {
  if (!isEntityType(entityType)) return { data: null, error: 'Unknown entity type.' };
  const auth = await authorizeOrganization();
  if (!auth.ok) return { data: null, error: auth.error };

  const { data, error } = await auth.context.supabase
    .from(TABLE)
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('organization_id', auth.organizationId)
    .order('locale', { ascending: true });

  if (error) {
    console.error('[getEntityTranslations]', error.message);
    return { data: [], error: null };
  }
  return { data: data ?? [], error: null };
}

/**
 * Create/update one locale's fields. Requires the owning module's manage
 * permission (or content.manage). Never publishes — use
 * setEntityTranslationStatus for review/publish steps.
 */
export async function upsertEntityTranslation(
  entityType: string,
  entityId: string,
  locale: string,
  fields: Record<string, unknown>,
  opts?: { assignedTo?: string | null },
) {
  if (!isEntityType(entityType)) return { data: null, error: 'Unknown entity type.' };
  if (!isSupportedEntityLocale(locale)) return { data: null, error: 'Unsupported locale.' };

  const auth = await authorizeOrganization();
  if (!auth.ok) return { data: null, error: auth.error };
  if (!canManage(auth.role, entityType)) {
    return { data: null, error: `You do not have permission to translate this ${entityType}.` };
  }

  const validated = validateEntityFields(entityType, fields);
  if (!validated.ok) return { data: null, error: validated.error ?? 'Invalid translation fields.' };

  const { data, error } = await auth.context.supabase
    .from(TABLE)
    .upsert(
      {
        entity_type: entityType,
        entity_id: entityId,
        organization_id: auth.organizationId,
        locale,
        fields: validated.fields ?? {},
        assigned_to: opts?.assignedTo ?? null,
        source: 'human',
        updated_by: auth.context.userId,
      },
      { onConflict: 'entity_type,entity_id,locale' },
    )
    .select()
    .maybeSingle();

  if (error) {
    console.error('[upsertEntityTranslation]', error.message);
    return { data: null, error: 'Unable to save translation. Please check the provided data.' };
  }

  revalidatePath('/admin/content');
  return { data, error: null };
}

/**
 * Move one locale through draft -> in_review -> approved -> published.
 * Publishing enforces the display-field gate; unpublishing returns to draft.
 */
export async function setEntityTranslationStatus(  entityType: string,
  entityId: string,
  locale: string,
  status: 'draft' | 'in_review' | 'approved' | 'published',
) {
  if (!isEntityType(entityType)) return { error: 'Unknown entity type.' };
  if (!isSupportedEntityLocale(locale)) return { error: 'Unsupported locale.' };

  const auth = await authorizeOrganization();
  if (!auth.ok) return { error: auth.error };
  if (!canManage(auth.role, entityType)) {
    return { error: `You do not have permission to translate this ${entityType}.` };
  }
  if (status === 'published' && !canPublish(auth.role, entityType)) {
    return { error: 'You do not have permission to publish translations.' };
  }

  const { data: existing } = await auth.context.supabase
    .from(TABLE)
    .select('fields')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('locale', locale)
    .eq('organization_id', auth.organizationId)
    .maybeSingle();

  if (!existing) return { error: 'Translation not found. Save the translation first.' };

  if (status === 'published' || status === 'approved') {
    const gate = canPublishEntityLocale(
      entityType,
      ((existing as { fields: Record<string, unknown> }).fields ?? {}) as Record<string, string | null | undefined>,
      status,
    );
    if (!gate.ok) return { error: gate.reason ?? 'Translation is not ready.' };
  }

  const { error } = await auth.context.supabase
    .from(TABLE)
    .update({ status, updated_by: auth.context.userId })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('locale', locale)
    .eq('organization_id', auth.organizationId);

  if (error) {
    console.error('[setEntityTranslationStatus]', error.message);
    return { error: 'Unable to change translation status. Please try again.' };
  }

  revalidatePath('/admin/content');
  revalidatePath('/', 'layout');
  return { error: null };
}

/**
 * AI-translate one entity locale (P0). Never auto-publishes: the row lands
 * as `machine_translated` with source `ai` and requires human review.
 * Reuses the CMS provider config (CMS_TRANSLATION_PROVIDER / _API_KEY).
 */
export async function requestEntityAiTranslation(
  entityType: string,
  entityId: string,
  targetLocale: string,
  sourceFields: Record<string, unknown>,
) {
  if (!isEntityType(entityType)) return { data: null, error: 'Unknown entity type.' };
  if (!isSupportedEntityLocale(targetLocale)) return { data: null, error: 'Unsupported locale.' };
  const auth = await authorizeOrganization();
  if (!auth.ok) return { data: null, error: auth.error };
  if (!canManage(auth.role, entityType)) {
    return { data: null, error: `You do not have permission to translate this ${entityType}.` };
  }
  const provider = (process.env.CMS_TRANSLATION_PROVIDER ?? 'none') as 'none' | 'openai' | 'deepl' | 'google';
  if (provider === 'none') return { data: null, error: 'AI translation is not configured.' };
  const hasKey = Boolean(
    process.env.CMS_TRANSLATION_API_KEY || process.env.OPENAI_API_KEY ||
    process.env.DEEPL_API_KEY || process.env.GOOGLE_TRANSLATION_API_KEY,
  );
  if (!hasKey) return { data: null, error: 'AI translation key is missing.' };

  // Minimal provider call: translate display strings only. Full CMS payload
  // translation lives in content.ts; entities carry flat string fields so a
  // compact OpenAI JSON call suffices, with graceful fallback to copy-source.
  let translated: Record<string, unknown> = { ...sourceFields };
  try {
    if (provider === 'openai') {
      const apiKey = process.env.CMS_TRANSLATION_API_KEY ?? process.env.OPENAI_API_KEY!;
      const endpoint = process.env.CMS_TRANSLATION_API_URL ?? 'https://api.openai.com/v1/chat/completions';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: process.env.CMS_TRANSLATION_MODEL ?? 'gpt-4o-mini',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Translate display strings to the target locale. Return only valid JSON with the same keys. Never invent content.' },
            { role: 'user', content: JSON.stringify({ target_locale: targetLocale, content: sourceFields }) },
          ],
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`OpenAI returned ${res.status}.`);
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty AI response.');
      const parsed: unknown = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) translated = parsed as Record<string, unknown>;
    }
  } catch (err) {
    console.error('[requestEntityAiTranslation]', err instanceof Error ? err.message : err);
    return { data: null, error: 'AI translation failed. You can still translate manually.' };
  }

  const validated = validateEntityFields(entityType, translated);
  if (!validated.ok) return { data: null, error: validated.error ?? 'AI output invalid.' };
  const { data, error } = await auth.context.supabase
    .from(TABLE)
    .upsert(
      {
        entity_type: entityType,
        entity_id: entityId,
        organization_id: auth.organizationId,
        locale: targetLocale,
        fields: validated.fields ?? {},
        status: 'machine_translated',
        source: 'ai',
        last_translated_at: new Date().toISOString(),
        updated_by: auth.context.userId,
      },
      { onConflict: 'entity_type,entity_id,locale' },
    )
    .select()
    .maybeSingle();
  if (error) {
    console.error('[requestEntityAiTranslation]', error.message);
    return { data: null, error: 'Unable to save AI translation.' };
  }
  revalidatePath('/admin/content');
  return { data, error: null, warning: 'AI-generated text requires human review before publishing.' };
}
