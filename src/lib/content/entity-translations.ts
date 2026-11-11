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
 * | news_article | title      | excerpt    | author_name |
 * | impact_story | title      | summary    | program, role |
 * | volunteer_role| title     | description| location, category, commitment |
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
  'news_article',
  'impact_story',
  'volunteer_role',
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
  news_article: 'title',
  impact_story: 'title',
  volunteer_role: 'title',
};

/** One editable translatable field, in editor order. */
export interface EntityTranslationField {
  /** Field key as stored inside `entity_translations.fields`. */
  key: string;
  /** Render as a multi-line textarea instead of a single-line input. */
  multiline?: boolean;
}

/**
 * The translatable fields offered per entity type in the admin editor.
 * The FIRST entry is always the display field (name/title) — it is the
 * value the publish gate checks, so it must never be reordered casually.
 * Mirrors the typed field shapes in `entityFieldsSchemas` above.
 */
export const ENTITY_TRANSLATION_FIELDS: Record<
  TranslatableEntityType,
  readonly EntityTranslationField[]
> = {
  campaign: [
    { key: 'name' },
    { key: 'description', multiline: true },
    { key: 'cta_label' },
    { key: 'cta_url' },
  ],
  project: [
    { key: 'name' },
    { key: 'description', multiline: true },
    { key: 'category_label' },
    { key: 'location' },
    { key: 'country' },
  ],
  partner: [
    { key: 'name' },
    { key: 'description', multiline: true },
  ],
  impact_metric: [
    { key: 'name' },
    { key: 'description', multiline: true },
    { key: 'unit_label' },
  ],
  org_event: [
    { key: 'title' },
    { key: 'description', multiline: true },
    { key: 'location' },
    { key: 'city' },
    { key: 'country' },
  ],
  organization: [
    { key: 'name' },
    { key: 'description', multiline: true },
    { key: 'mission', multiline: true },
    { key: 'vision', multiline: true },
  ],
  news_article: [
    { key: 'title' },
    { key: 'excerpt', multiline: true },
    { key: 'author_name' },
  ],
  impact_story: [
    { key: 'title' },
    { key: 'summary', multiline: true },
    { key: 'program' },
    { key: 'role' },
  ],
  volunteer_role: [
    { key: 'title' },
    { key: 'description', multiline: true },
    { key: 'location' },
    { key: 'category' },
    { key: 'commitment' },
  ],
};

const baseFields = {
  name: z.string().max(300).optional().nullable(),
  title: z.string().max(300).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  excerpt: z.string().max(2000).optional().nullable(),
  summary: z.string().max(2000).optional().nullable(),
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
  news_article: z.object({
    ...baseFields,
    author_name: z.string().max(200).optional().nullable(),
  }),
  impact_story: z.object({
    ...baseFields,
    program: z.string().max(200).optional().nullable(),
    role: z.string().max(120).optional().nullable(),
  }),
  volunteer_role: z.object({
    ...baseFields,
    location: z.string().max(300).optional().nullable(),
    category: z.string().max(120).optional().nullable(),
    commitment: z.string().max(300).optional().nullable(),
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
  news_article: 'content.manage',
  impact_story: 'content.manage',
  volunteer_role: 'content.manage',
};

export function isEntityType(value: string): value is TranslatableEntityType {
  return (ENTITY_TYPES as readonly string[]).includes(value);
}

export function isSupportedEntityLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
