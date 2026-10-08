import { describe, expect, it } from 'vitest';

import { CSV_BOM, toCsv } from '@/lib/csv';

describe('csv export', () => {
    it('emits a BOM so Excel detects UTF-8', () => {
        expect(toCsv([{ a: 1 }])[0]).toBe(CSV_BOM);
    });

    it('escapes quotes, commas, and newlines per RFC-4180', () => {
        const out = toCsv([{ name: 'Doe, "JD"', note: 'line1\nline2', n: null }]);
        expect(out).toContain('"Doe, ""JD"""');
        expect(out).toContain('"line1\nline2"');
        expect(out.endsWith(',\n')).toBe(true);
    });

    it('keeps ragged rows rectangular in first-seen key order', () => {
        const out = toCsv([{ a: 1, b: 2 }, { b: 3, c: 4 }]);
        expect(out.startsWith(CSV_BOM)).toBe(true);
        const lines = out.slice(CSV_BOM.length).trim().split('\n');
        expect(lines[0]).toBe('a,b,c');
        expect(lines[1]).toBe('1,2,');
        expect(lines[2]).toBe(',3,4');
    });

    it('serializes nested objects as JSON', () => {
        expect(toCsv([{ f: { x: 1 } }])).toContain('"{""x"":1}"');
    });

    it('handles empty input without throwing', () => {
        expect(toCsv([])).toBe(`${CSV_BOM}\n`);
    });
});
