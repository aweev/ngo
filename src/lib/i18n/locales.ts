/**
 * Single source of truth for supported locales.
 *
 * Import from here — never hardcode locale lists in components,
 * actions, migrations docs, or admin UI.
 *
 * Mirrors `routing.locales` in `src/lib/navigation.ts`.
 * Keep both in sync; this module is the descriptive side
 * (labels, RTL, fallback) while navigation.ts owns routing.
 */

// All locales across the entire app (donor-facing + field-facing)
export const ALL_LOCALES = ['en', 'de', 'fr', 'es', 'ar', 'sw', 'ha'] as const;
export type AllLocale = (typeof ALL_LOCALES)[number];

// Donor-facing locales (public site, admin, dashboard, auth)
export const DONOR_LOCALES = ['en', 'de', 'fr', 'es', 'ar'] as const;
export type DonorLocale = (typeof DONOR_LOCALES)[number];

// Field-facing locales (field app, beneficiary comms)
export const FIELD_LOCALES = ['en', 'sw', 'ha', 'fr', 'ar'] as const;
export type FieldLocale = (typeof FIELD_LOCALES)[number];

// Backward compatibility — default to donor locales
export const SUPPORTED_LOCALES = DONOR_LOCALES;
export type SupportedLocale = DonorLocale;

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const RTL_LOCALES: readonly AllLocale[] = ['ar'];

export const LOCALE_LABELS: Record<AllLocale, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  ar: 'العربية',
  sw: 'Kiswahili',
  ha: 'Hausa',
};

export const LOCALE_SHORT: Record<AllLocale, string> = {
  en: 'EN',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  ar: 'AR',
  sw: 'SW',
  ha: 'HA',
};

export function isSupportedLocale(locale: string | null | undefined): locale is SupportedLocale {
  return !!locale && (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export function isFieldLocale(locale: string | null | undefined): locale is FieldLocale {
  return !!locale && (FIELD_LOCALES as readonly string[]).includes(locale);
}

export function isDonorLocale(locale: string | null | undefined): locale is DonorLocale {
  return !!locale && (DONOR_LOCALES as readonly string[]).includes(locale);
}

export function isAnySupportedLocale(locale: string | null | undefined): locale is AllLocale {
  return !!locale && (ALL_LOCALES as readonly string[]).includes(locale);
}

/** Normalizes e.g. "en-US" -> "en". Falls back to default when unsupported. */
export function normalizeLocale(locale: string | null | undefined): SupportedLocale {
  if (!locale) return DEFAULT_LOCALE;
  const base = locale.split('-')[0]?.toLowerCase();
  if (isSupportedLocale(base)) return base;
  if (isSupportedLocale(locale.toLowerCase())) return locale.toLowerCase() as SupportedLocale;
  return DEFAULT_LOCALE;
}

/** Normalizes for field app — falls back to 'en' if not a field locale. */
export function normalizeFieldLocale(locale: string | null | undefined): FieldLocale {
  if (!locale) return 'en';
  const base = locale.split('-')[0]?.toLowerCase();
  if (isFieldLocale(base)) return base;
  if (isFieldLocale(locale.toLowerCase())) return locale.toLowerCase() as FieldLocale;
  return 'en';
}

export function isRtlLocale(locale: string | null | undefined): boolean {
  return RTL_LOCALES.includes(normalizeLocale(locale) as AllLocale);
}

/**
 * Locale fallback chain: requested -> base language -> default.
 * Example: "de-AT" -> ["de", "en"].
 */
export function localeFallbackChain(locale: string | null | undefined): SupportedLocale[] {
  const normalized = normalizeLocale(locale);
  if (normalized === DEFAULT_LOCALE) return [DEFAULT_LOCALE];
  return [normalized, DEFAULT_LOCALE];
}

/** Field app fallback chain. */
export function fieldLocaleFallbackChain(locale: string | null | undefined): FieldLocale[] {
  const normalized = normalizeFieldLocale(locale);
  if (normalized === 'en') return ['en'];
  return [normalized, 'en'];
}
