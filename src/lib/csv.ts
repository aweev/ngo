/**
 * CSV export (Phase 2.2a).
 *
 * Deterministic, RFC-4180 escaping, UTF-8 BOM so Excel opens non-ASCII text
 * correctly. Header is the union of keys in first-seen order — snapshots
 * with ragged rows stay rectangular.
 */

/** BOM: Excel needs it to detect UTF-8. */
export const CSV_BOM = '﻿';

function cell(value: unknown): string {
    let text: string;
    if (value === null || value === undefined) text = '';
    else if (typeof value === 'object') text = JSON.stringify(value);
    else text = String(value);
    if (/["\n,]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
    if (rows.length === 0) return `${CSV_BOM}\n`;
    const header: string[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!seen.has(key)) {
                seen.add(key);
                header.push(key);
            }
        }
    }
    const lines = [header.map(cell).join(',')];
    for (const row of rows) {
        lines.push(header.map((key) => cell(row[key])).join(','));
    }
    return CSV_BOM + lines.join('\n') + '\n';
}
