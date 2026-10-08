import { describe, expect, it } from 'vitest';

import { convertAmount, findRate, type RateRow } from '@/lib/fx';

const RATES: RateRow[] = [
    { from_currency: 'EUR', to_currency: 'USD', rate: 1.1, rate_date: '2026-01-01' },
    { from_currency: 'EUR', to_currency: 'USD', rate: 1.2, rate_date: '2026-06-01' },
];

describe('fx conversion', () => {
    it('uses the latest rate on or before the date', () => {
        expect(findRate(RATES, 'EUR', 'USD', '2026-03-01')).toBe(1.1);
        expect(findRate(RATES, 'EUR', 'USD', '2026-09-01')).toBe(1.2);
    });

    it('returns 1 for identical currencies without a rate row', () => {
        expect(convertAmount(100, 'EUR', 'EUR', [], '2026-09-01')).toBe(100);
    });

    it('returns null instead of guessing when no rate exists', () => {
        expect(findRate(RATES, 'EUR', 'USD', '2025-01-01')).toBeNull();
        expect(findRate(RATES, 'USD', 'EUR', '2026-09-01')).toBeNull();
        expect(convertAmount(100, 'USD', 'EUR', RATES, '2026-09-01')).toBeNull();
    });

    it('converts with the matched rate', () => {
        expect(convertAmount(100, 'EUR', 'USD', RATES, '2026-09-01')).toBe(120);
    });
});
