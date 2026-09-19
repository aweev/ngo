import { describe, expect, it } from 'vitest';
import {
    dateLocale,
    formatPublicCompact,
    formatPublicCurrency,
    formatPublicDate,
    formatPublicNumber,
} from '@/lib/i18n/format';

describe('dateLocale', () => {
    it('maps supported locales to Intl tags and falls back to en-US', () => {
        expect(dateLocale('de')).toBe('de-DE');
        expect(dateLocale('ar')).toBe('ar-EG');
        expect(dateLocale('nope')).toBe('en-US');
        expect(dateLocale(null)).toBe('en-US');
    });
});

describe('formatPublicNumber', () => {
    it('applies locale-specific grouping', () => {
        expect(formatPublicNumber(1234.5, 'en')).toBe('1,234.5');
        expect(formatPublicNumber(1234.5, 'de')).toBe('1.234,5');
    });
});

describe('formatPublicCurrency', () => {
    it('formats EUR for the English site', () => {
        expect(formatPublicCurrency(1200, 'en')).toBe('€1,200.00');
    });
});

describe('formatPublicCompact', () => {
    it('compacts thousands with a trailing plus', () => {
        expect(formatPublicCompact(1500, 'en')).toBe('1.5K+');
    });

    it('leaves sub-thousand values uncompacted', () => {
        expect(formatPublicCompact(950, 'en')).toBe('950');
    });
});

describe('formatPublicDate', () => {
    it('renders a readable date for the requested locale', () => {
        const out = formatPublicDate('2026-01-15T12:00:00Z', 'en');
        expect(out).toContain('2026');
        expect(out).toContain('15');
    });
});