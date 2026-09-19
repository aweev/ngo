import { describe, expect, it } from 'vitest';
import {
    DEFAULT_LOCALE,
    LOCALE_LABELS,
    LOCALE_SHORT,
    RTL_LOCALES,
    SUPPORTED_LOCALES,
    isRtlLocale,
    isSupportedLocale,
    localeFallbackChain,
    normalizeLocale,
} from '@/lib/i18n/locales';

describe('supported locales', () => {
    it('covers every locale with a label and a 2-letter short code', () => {
        for (const l of SUPPORTED_LOCALES) {
            expect(LOCALE_LABELS[l]).toBeTruthy();
            expect(LOCALE_SHORT[l]).toHaveLength(2);
        }
    });

    it('marks Arabic as the only RTL locale', () => {
        expect(RTL_LOCALES).toEqual(['ar']);
    });
});

describe('isSupportedLocale / normalizeLocale', () => {
    it('accepts supported codes and rejects everything else, fail-closed', () => {
        expect(isSupportedLocale('de')).toBe(true);
        expect(isSupportedLocale('xx')).toBe(false);
        expect(isSupportedLocale('')).toBe(false);
        expect(isSupportedLocale(null)).toBe(false);
        expect(isSupportedLocale(undefined)).toBe(false);
    });

    it('normalizes region variants and casing', () => {
        expect(normalizeLocale('en-US')).toBe('en');
        expect(normalizeLocale('DE')).toBe('de');
        expect(normalizeLocale('pt-BR')).toBe(DEFAULT_LOCALE);
        expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
    });
});

describe('isRtlLocale / localeFallbackChain', () => {
    it('detects RTL through normalization', () => {
        expect(isRtlLocale('ar-EG')).toBe(true);
        expect(isRtlLocale('en')).toBe(false);
        expect(isRtlLocale(undefined)).toBe(false);
    });

    it('falls back requested -> default', () => {
        expect(localeFallbackChain('de-AT')).toEqual(['de', 'en']);
        expect(localeFallbackChain('en')).toEqual(['en']);
        expect(localeFallbackChain('zz')).toEqual(['en']);
    });
});