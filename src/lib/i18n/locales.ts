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

export const SUPPORTED_LOCALES = ['en', 'de', 'fr', 'es', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const RTL_LOCALES: readonly SupportedLocale[] = ['ar'];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  ar: 'العربية',
};

export const LOCALE_SHORT: Record<SupportedLocale, string> = {
  en: 'EN',
  de: 'DE',
  fr: 'FR',
  es: 'ES',
  ar: 'AR',
};

export function isSupportedLocale(locale: string | null | undefined): locale is SupportedLocale {
  return !!locale && (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

/** Normalizes e.g. "en-US" -> "en". Falls back to default when unsupported. */
export function normalizeLocale(locale: string | null | undefined): SupportedLocale {
  if (!locale) return DEFAULT_LOCALE;
  const base = locale.split('-')[0]?.toLowerCase();
  if (isSupportedLocale(base)) return base;
  if (isSupportedLocale(locale.toLowerCase())) return locale.toLowerCase() as SupportedLocale;
  return DEFAULT_LOCALE;
}

export function isRtlLocale(locale: string | null | undefined): boolean {
  return RTL_LOCALES.includes(normalizeLocale(locale) as SupportedLocale);
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
