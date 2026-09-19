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
export async function setEntityTranslationStatus(
  entityType: string,
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
