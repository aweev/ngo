import { z } from 'zod';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  type SupportedLocale,
  normalizeLocale,
} from '@/lib/i18n/locales';

/**
 * Canonical CMS translation + approval model.
 *
 * Two storage shapes are supported and merged at read time:
 *  1. `content_page_translations` rows (one per page per locale) — preferred.
 *  2. Legacy JSON inside `content_pages.content.translations | .locales`
 *     — read-only fallback until backfilled.
 *
 * Per-locale translatable fields: title, body/content blocks, metadata,
 * alt text, CTA labels + links, taxonomy/category values.
 */

// ---------------------------------------------------------------------------
// Workflow states
// ---------------------------------------------------------------------------

export const TRANSLATION_STATUS = [
  'missing',
  'draft',
  'machine_translated',
  'in_review',
  'approved',
  'published',
] as const;
export type TranslationStatus = (typeof TRANSLATION_STATUS)[number];

export const CONTENT_WORKFLOW_STATE = [
  'draft',
  'translation_pending',
  'in_review',
  'changes_requested',
  'approved',
  'published',
  'archived',
] as const;
export type ContentWorkflowState = (typeof CONTENT_WORKFLOW_STATE)[number];

/** States that allow the page to appear on the public site. */
export const PUBLISHED_WORKFLOW_STATES: readonly ContentWorkflowState[] = ['published'];

/** Forward-only transitions; `archived` is reachable from anywhere except draft. */
const WORKFLOW_TRANSITIONS: Record<ContentWorkflowState, readonly ContentWorkflowState[]> = {
  draft: ['translation_pending', 'in_review', 'archived'],
  translation_pending: ['in_review', 'draft', 'archived'],
  in_review: ['changes_requested', 'approved', 'draft', 'archived'],
  changes_requested: ['draft', 'translation_pending', 'in_review', 'archived'],
  approved: ['published', 'in_review', 'archived'],
  published: ['archived', 'in_review'],
  archived: ['draft'],
};

export function canTransitionWorkflow(
  from: ContentWorkflowState,
  to: ContentWorkflowState,
): boolean {
  if (from === to) return true;
  return WORKFLOW_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Strict shape for one locale's translatable payload. */
export const localeContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  body: z.record(z.string(), z.unknown()).optional().default({}),
  excerpt: z.string().max(500).optional().nullable(),
  meta_title: z.string().max(200).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
  cover_image_url: z.string().url().optional().nullable().or(z.literal('')),
  cover_alt_text: z.string().max(300).optional().nullable(),
  cta_label: z.string().max(120).optional().nullable(),
  cta_url: z.string().max(1000).optional().nullable(),
  category_label: z.string().max(120).optional().nullable(),
});

export type LocaleContent = z.infer<typeof localeContentSchema>;

/** Full translation row (DB shape). */
export const translationRecordSchema = z.object({
  id: z.string().uuid().optional(),
  page_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  locale: z.enum(SUPPORTED_LOCALES),
  status: z.enum(TRANSLATION_STATUS).default('draft'),
  title: z.string().min(1).max(300),
  content: z.record(z.string(), z.unknown()).default({}),
  meta_title: z.string().max(200).optional().nullable(),
  meta_description: z.string().max(500).optional().nullable(),
  cover_image_url: z.string().nullable().optional(),
  version: z.number().int().min(1).default(1),
  assigned_to: z.string().uuid().nullable().optional(),
  last_translated_at: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
});

export type TranslationRecord = z.infer<typeof translationRecordSchema>;

/** Legacy JSON blob shape (`content.translations[locale]`). Validated loosely. */
const legacyLocaleBlob = z.record(z.string(), z.unknown());

export function parseLegacyTranslations(
  content: Record<string, unknown> | null | undefined,
): Partial<Record<SupportedLocale, Record<string, unknown>>> {
  if (!content || typeof content !== 'object') return {};
  const container = (content.translations ?? content.locales) as unknown;
  if (!container || typeof container !== 'object' || Array.isArray(container)) return {};
  const parsed = legacyLocaleBlob.safeParse(container);
  if (!parsed.success) return {};
  const out: Partial<Record<SupportedLocale, Record<string, unknown>>> = {};
  for (const [locale, blob] of Object.entries(parsed.data)) {
    const base = normalizeLocale(locale);
    if (locale !== base && locale !== DEFAULT_LOCALE && !(locale in out)) {
      // keep exact match only; normalized fallback handled at read time
    }
    if (
      (SUPPORTED_LOCALES as readonly string[]).includes(locale) &&
      blob &&
      typeof blob === 'object' &&
      !Array.isArray(blob)
    ) {
      out[locale as SupportedLocale] = blob as Record<string, unknown>;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Completeness + fallback
// ---------------------------------------------------------------------------

export const REQUIRED_LOCALE_FIELDS = ['title'] as const;

export interface LocaleCoverage {
  locale: SupportedLocale;
  status: TranslationStatus;
  completeness: number; // 0..1
  missingFields: string[];
  updatedAt: string | null;
  published: boolean;
}

/**
 * Completeness = share of tracked fields present with non-empty values.
 * Tracked: title, body/content, excerpt, meta_title, meta_description,
 * cover_alt_text, cta_label, cta_url, category_label.
 */
const TRACKED_FIELDS = [
  'title',
  'body',
  'excerpt',
  'meta_title',
  'meta_description',
  'cover_alt_text',
  'cta_label',
  'cta_url',
  'category_label',
] as const;

function isNonEmpty(v: unknown): boolean {
  if (typeof v === 'string') return v.trim().length > 0;
  if (v && typeof v === 'object') return Object.keys(v as object).length > 0;
  return v !== null && v !== undefined;
}

export function translationCompleteness(payload: Record<string, unknown>): {
  completeness: number;
  missingFields: string[];
} {
  const missing = TRACKED_FIELDS.filter((f) => {
    if (f === 'body') {
      const body = payload.body ?? payload.content ?? payload.blocks;
      return !isNonEmpty(body);
    }
    return !isNonEmpty(payload[f]);
  });
  // Title weighs double: publishing without it is never allowed.
  const total = TRACKED_FIELDS.length + 1;
  const present = total - missing.length - (missing.includes('title') ? 1 : 0);
  return {
    completeness: Math.max(0, Math.min(1, present / total)),
    missingFields: [...missing],
  };
}

/** Guard: a locale may publish only when required fields pass + status approved/published. */
export function canPublishLocale(
  payload: Record<string, unknown>,
  status: TranslationStatus,
): { ok: boolean; reason?: string } {
  if (status !== 'approved' && status !== 'published') {
    return { ok: false, reason: `Locale status is "${status}" — approval is required before publishing.` };
  }
  const title = payload.title;
  if (typeof title !== 'string' || title.trim().length === 0) {
    return { ok: false, reason: 'Title is required in this locale before publishing.' };
  }
  const result = localeContentSchema.safeParse({
    title: payload.title,
    body: (payload.body ?? payload.content ?? {}) as Record<string, unknown>,
    excerpt: (payload.excerpt as string | undefined) ?? null,
    meta_title: (payload.meta_title as string | undefined) ?? null,
    meta_description: (payload.meta_description as string | undefined) ?? null,
    cover_image_url: (payload.cover_image_url as string | undefined) ?? null,
    cover_alt_text: (payload.cover_alt_text as string | undefined) ?? null,
    cta_label: (payload.cta_label as string | undefined) ?? null,
    cta_url: (payload.cta_url as string | undefined) ?? null,
    category_label:
      (payload.category_label as string | undefined) ??
      (payload.category as string | undefined) ??
      null,
  });
  if (!result.success) {
    return { ok: false, reason: result.error.issues[0]?.message ?? 'Locale content is invalid.' };
  }
  return { ok: true };
}

export interface LocalizedResolution<T> {
  locale: SupportedLocale;
  usedFallback: boolean;
  fallbackFrom: SupportedLocale | null;
  value: T | null;
}

/**
 * Resolves one page's localized payload across the fallback chain.
 * `rows`: translation rows keyed by locale; `legacyContent`: raw page content
 * for the JSON fallback. Default-locale content is the base payload.
 */
export function resolveLocaleContent(
  locale: string | null | undefined,
  rows: Partial<Record<SupportedLocale, Record<string, unknown>>>,
  legacyContent?: Record<string, unknown> | null,
  legacyTranslations?: Partial<Record<SupportedLocale, Record<string, unknown>>>,
): LocalizedResolution<Record<string, unknown>> {
  const requested = normalizeLocale(locale);
  const chain: SupportedLocale[] =
    requested === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [requested, DEFAULT_LOCALE];
  for (const loc of chain) {
    const row = rows[loc];
    if (row && Object.keys(row).length > 0) {
      return {
        locale: loc,
        usedFallback: loc !== requested,
        fallbackFrom: loc !== requested ? requested : null,
        value: row,
      };
    }
    const legacy = legacyTranslations?.[loc];
    if (legacy && Object.keys(legacy).length > 0) {
      const inner =
        legacy.content && typeof legacy.content === 'object' && !Array.isArray(legacy.content)
          ? (legacy.content as Record<string, unknown>)
          : legacy;
      return {
        locale: loc,
        usedFallback: loc !== requested,
        fallbackFrom: loc !== requested ? requested : null,
        value: { ...inner, title: legacy.title ?? inner.title },
      };
    }
  }
  if (legacyContent && Object.keys(legacyContent).length > 0) {
    return { locale: DEFAULT_LOCALE, usedFallback: requested !== DEFAULT_LOCALE, fallbackFrom: requested, value: legacyContent };
  }
  return { locale: requested, usedFallback: false, fallbackFrom: null, value: null };
}

/** Builds per-locale coverage across all supported locales. */
export function buildLocaleCoverage(
  rows: Partial<
    Record<SupportedLocale, { payload: Record<string, unknown>; status: TranslationStatus; updatedAt: string | null }>
  >,
  legacyTranslations?: Partial<Record<SupportedLocale, Record<string, unknown>>>,
): LocaleCoverage[] {
  return SUPPORTED_LOCALES.map((locale) => {
    const row = rows[locale];
    const payload = row?.payload ?? legacyTranslations?.[locale] ?? {};
    const { completeness, missingFields } = translationCompleteness(payload);
    const hasAny = Object.keys(payload).length > 0;
    const status: TranslationStatus = row?.status ?? (hasAny ? 'draft' : 'missing');
    return {
      locale,
      status,
      completeness,
      missingFields,
      updatedAt: row?.updatedAt ?? null,
      published: status === 'published',
    };
  });
}

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

export const translationExportSchema = z.object({
  version: z.literal(1),
  pageSlug: z.string(),
  exportedAt: z.string(),
  locales: z.record(z.string(), z.record(z.string(), z.unknown())),
});
export type TranslationExport = z.infer<typeof translationExportSchema>;

export function exportTranslations(
  pageSlug: string,
  byLocale: Partial<Record<SupportedLocale, Record<string, unknown>>>,
): TranslationExport {
  return {
    version: 1,
    pageSlug,
    exportedAt: new Date().toISOString(),
    locales: Object.fromEntries(
      Object.entries(byLocale).filter(([, v]) => v && Object.keys(v).length > 0),
    ) as Record<string, Record<string, unknown>>,
  };
}

export function importTranslations(raw: unknown): {
  ok: boolean;
  locales?: Partial<Record<SupportedLocale, Record<string, unknown>>>;
  error?: string;
} {
  const parsed = translationExportSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid translation export file.' };
  }
  const locales: Partial<Record<SupportedLocale, Record<string, unknown>>> = {};
  for (const [locale, payload] of Object.entries(parsed.data.locales)) {
    if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) continue;
    locales[locale as SupportedLocale] = payload;
  }
  return { ok: true, locales };
}
