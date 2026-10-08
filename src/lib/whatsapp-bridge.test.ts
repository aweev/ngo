import { describe, expect, it } from 'vitest';
import { FIELD_REPORT_GUIDANCE, parseFieldReport } from '@/lib/whatsapp-bridge';

const VALID = 'PROJECT=water-access METRIC=water-filters VALUE=12 LOCATION=Sector 4';

describe('parseFieldReport', () => {
    it('parses a fully identified report', () => {
        const parsed = parseFieldReport(VALID);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.projectCode).toBe('water-access');
        expect(parsed.metricCode).toBe('water-filters');
        expect(parsed.quantity).toBe(12);
        expect(parsed.location).toBe('Sector 4');
        expect(parsed.note).toBeNull();
        expect(parsed.reportedAt).toBeNull();
    });

    it('accepts lower case, spaces, and colon separators', () => {
        const parsed = parseFieldReport('project: water-access metric water-filters value 1.234,5 location: Sector 4');
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.quantity).toBe(1234.5);
        expect(parsed.projectCode).toBe('water-access');
    });

    it('never guesses a quantity from free text', () => {
        const parsed = parseFieldReport('DISTRIBUTED 500 WATER FILTERS AT SECTOR 4');
        expect(parsed.ok).toBe(false);
        if (parsed.ok) return;
        expect(parsed.code).toBe('missing_fields');
        expect(parsed.missing).toEqual(['PROJECT', 'METRIC', 'VALUE']);
        // "AT SECTOR 4" must NOT be treated as LOCATION when identifiers are absent.
        expect(parsed.message).toContain(FIELD_REPORT_GUIDANCE);
    });

    it('lists every missing identifier so the reporter can fix the message', () => {
        const parsed = parseFieldReport('PROJECT=water METRIC=filters');
        expect(parsed.ok).toBe(false);
        if (parsed.ok) return;
        expect(parsed.missing).toEqual(['VALUE', 'LOCATION']);
    });

    it('rejects non-positive or absurd quantities', () => {
        for (const value of ['0', '-4', '9999999999999']) {
            const parsed = parseFieldReport(`PROJECT=w METRIC=m VALUE=${value} LOCATION=Sector 4`);
            expect(parsed.ok).toBe(false);
            if (parsed.ok) continue;
            expect(parsed.code).toBe('invalid_value');
        }
    });

    it('rejects unusable identifiers', () => {
        const parsed = parseFieldReport('PROJECT=../../etc/passwd METRIC=filters VALUE=3 LOCATION=Sector 4');
        expect(parsed.ok).toBe(false);
        if (parsed.ok) return;
        expect(parsed.code).toBe('invalid_identifier');
        expect(parsed.missing).toContain('PROJECT');
    });

    it('handles empty and whitespace-only messages', () => {
        for (const value of ['', '   ', null, undefined]) {
            const parsed = parseFieldReport(value);
            expect(parsed.ok).toBe(false);
            if (parsed.ok) continue;
            expect(parsed.code).toBe('empty');
        }
    });

    it('carries optional NOTE and DATE through', () => {
        const parsed = parseFieldReport(`${VALID} NOTE=Roof collapse at the north pump DATE=2026-09-20`);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.note).toBe('Roof collapse at the north pump');
        expect(parsed.reportedAt).toBe('2026-09-20');
    });

    it('collapses whitespace and keeps the raw text for the audit trail', () => {
        const parsed = parseFieldReport('  PROJECT=water   METRIC=filters\n VALUE=3   LOCATION=Sector 4  ');
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(parsed.rawText).toBe('PROJECT=water METRIC=filters VALUE=3 LOCATION=Sector 4');
    });
});
