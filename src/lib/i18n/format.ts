import { normalizeLocale, type SupportedLocale } from './locales';

/**
 * Locale-aware formatting for public pages.
 * Replaces hardcoded `en-US` / `"en"` formatting so dates, numbers,
 * currencies, and compact counts render correctly in DE, FR, ES, AR
 * (including Arabic-Indic digits and RTL-safe output).
 */

const DATE_LOCALE: Record<SupportedLocale, string> = {
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  ar: 'ar-EG',
};

export function dateLocale(locale: string | null | undefined): string {
  return DATE_LOCALE[normalizeLocale(locale)];
}

export function formatPublicDate(
  value: string | Date,
  locale: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  try {
    return new Date(value).toLocaleDateString(dateLocale(locale), opts);
  } catch {
    return new Date(value).toLocaleDateString('en-US', opts);
  }
}

export function formatPublicDateTime(
  value: string | Date,
  locale: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
): string {
  try {
    return new Date(value).toLocaleDateString(dateLocale(locale), opts);
  } catch {
    return new Date(value).toLocaleDateString('en-US', opts);
  }
}

export function formatPublicNumber(
  value: number,
  locale: string | null | undefined,
  opts?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(dateLocale(locale), opts).format(value);
  } catch {
    return new Intl.NumberFormat('en-US', opts).format(value);
  }
}

export function formatPublicCurrency(
  value: number,
  locale: string | null | undefined,
  currency = 'EUR',
): string {
  return formatPublicNumber(value, locale, { style: 'currency', currency });
}

/** Compact "1.2k+" style counts, locale-aware. */
export function formatPublicCompact(value: number, locale: string | null | undefined): string {
  const tag = dateLocale(locale);
  try {
    if (value >= 1000) {
      const formatted = new Intl.NumberFormat(tag, {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
      // Latin compact already carries "+", Arabic compact carries "‏+". Keep suffix.
      return formatted.endsWith('+') ? formatted : `${formatted}+`;
    }
    return new Intl.NumberFormat(tag).format(value);
  } catch {
    if (value >= 1000) {
      const k = value / 1000;
      return `${k >= 100 ? Math.round(k).toString() : k.toFixed(1).replace(/\.0$/, '')}k+`;
    }
    return value.toString();
  }
}
