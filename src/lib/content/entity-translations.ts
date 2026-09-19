import { z } from 'zod';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/i18n/locales';

/**
 * Per-entity translatable fields for every public entity used on the
 * home/About pages (migration 20240101000023 `entity_translations`).
 *
 * | Entity       | name/title | body text  | extra text fields |
 * |--------------|------------|------------|-------------------|
 * | campaign     | name       | description| cta_label, cta_url |
 * | project      | name       | description| category_label, location, country |
 * | partner      | name       | description| — |
 * | impact_metric| name       | description| unit_label |
 * | org_event    | title      | description| location, city, country |
 * | organization | name       | description| mission, vision |
 *
 * Numbers, dates, currencies, images, URLs (except CTA text links),
 * and taxonomy IDs are NEVER translated — only display strings.
 */

export const ENTITY_TYPES = [
  'campaign',
  'project',
  'partner',
  'impact_metric',
  'org_event',
  'organization',
] as const;
export type TranslatableEntityType = (typeof ENTITY_TYPES)[number];

/** Display field used as the publish gate per entity type. */
export const ENTITY_DISPLAY_FIELD: Record<TranslatableEntityType, 'name' | 'title'> = {
  campaign: 'name',
  project: 'name',
  partner: 'name',
  impact_metric: 'name',
  org_event: 'title',
  organization: 'name',
};

const baseFields = {
  name: z.string().max(300).optional().nullable(),
  title: z.string().max(300).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
};

export const entityFieldsSchemas: Record<TranslatableEntityType, z.ZodTypeAny> = {
  campaign: z.object({
    ...baseFields,
    cta_label: z.string().max(120).optional().nullable(),
    cta_url: z.string().max(1000).optional().nullable(),
  }),
  project: z.object({
    ...baseFields,
    category_label: z.string().max(120).optional().nullable(),
    location: z.string().max(300).optional().nullable(),
    country: z.string().max(120).optional().nullable(),
  }),
  partner: z.object({ ...baseFields }),
  impact_metric: z.object({
    ...baseFields,
    unit_label: z.string().max(60).optional().nullable(),
  }),
  org_event: z.object({
    ...baseFields,
    location: z.string().max(300).optional().nullable(),
    city: z.string().max(120).optional().nullable(),
    country: z.string().max(120).optional().nullable(),
  }),
  organization: z.object({
    ...baseFields,
    mission: z.string().max(5000).optional().nullable(),
    vision: z.string().max(5000).optional().nullable(),
  }),
};

export type EntityFields = Record<string, string | null | undefined>;

export function validateEntityFields(
  entityType: TranslatableEntityType,
  fields: unknown,
): { ok: boolean; error?: string; fields?: EntityFields } {
  const schema = entityFieldsSchemas[entityType];
  const parsed = schema.safeParse(fields);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid translation fields.' };
  }
  return { ok: true, fields: parsed.data as EntityFields };
}

/** A locale may publish only when approved/published + display field present. */
export function canPublishEntityLocale(
  entityType: TranslatableEntityType,
  fields: EntityFields,
  status: string,
): { ok: boolean; reason?: string } {
  if (status !== 'approved' && status !== 'published') {
    return { ok: false, reason: `Status is "${status}" — approval is required before publishing.` };
  }
  const display = ENTITY_DISPLAY_FIELD[entityType];
  const value = fields[display];
  if (typeof value !== 'string' || value.trim().length === 0) {
    const label = display === 'name' ? 'Name' : 'Title';
    return { ok: false, reason: `${label} is required in this locale before publishing.` };
  }
  return { ok: true };
}

/** Owning-module manage permission per entity type (for server actions). */
export const ENTITY_MANAGE_PERMISSIONS: Record<TranslatableEntityType, string> = {
  campaign: 'campaigns.manage',
  project: 'projects.manage',
  partner: 'partners.manage',
  impact_metric: 'impact.manage',
  org_event: 'events.manage',
  organization: 'settings.manage',
};

export function isEntityType(value: string): value is TranslatableEntityType {
  return (ENTITY_TYPES as readonly string[]).includes(value);
}

export function isSupportedEntityLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
