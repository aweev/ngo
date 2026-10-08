/**
 * Field-report message parser (WhatsApp / SMS).
 *
 * Field reports arrive over a low-bandwidth channel and are written by people
 * who may be tired, under time pressure, and accountable for the numbers they
 * submit. The old parser guessed a quantity, a category, and a location out of
 * free text ("DISTRIBUTED 500 WATER FILTERS AT SECTOR 4") and wrote the guess
 * straight into impact data. That is not acceptable: a guess is indistinguish-
 * able from a fact once stored.
 *
 * This parser therefore requires explicit, machine-checkable identifiers:
 *
 *   PROJECT=<project-slug> METRIC=<metric-slug> VALUE=<number> LOCATION=<place>
 *   ... optionally NOTE=<free text> and DATE=<yyyy-mm-dd>
 *
 * `PROJECT SAFE-WATER` (space instead of `=`) is accepted too, because it is
 * easier to type on a keypad. Anything missing is reported back as a specific,
 * user-facing error -- the message is never silently guessed at.
 */

export const FIELD_REPORT_IDENTIFIERS = ['PROJECT', 'METRIC', 'VALUE', 'LOCATION'] as const;

/** Copy-pasteable format help, returned to unknown senders and shown in admin. */
export const FIELD_REPORT_GUIDANCE =
    'PROJECT=<project> METRIC=<metric> VALUE=<number> LOCATION=<place> [NOTE=<text>]';

export const FIELD_REPORT_MAX_QUANTITY = 1_000_000_000;

export interface FieldReportDraft {
    ok: true;
    projectCode: string;
    metricCode: string;
    quantity: number;
    location: string;
    note: string | null;
    reportedAt: string | null;
    rawText: string;
}

export type FieldReportParseErrorCode =
    | 'empty'
    | 'missing_fields'
    | 'invalid_value'
    | 'invalid_identifier';

export interface FieldReportParseError {
    ok: false;
    code: FieldReportParseErrorCode;
    /** Identifiers that were absent or unusable, in canonical order. */
    missing: string[];
    /** Safe, non-technical explanation for the reporter. */
    message: string;
}

export type FieldReportParseResult = FieldReportDraft | FieldReportParseError;

/** Lowercase identifier slugs: project/metric codes are compared case-insensitively. */
const IDENTIFIER_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/;

function escapeForRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** `KEY=<value>` or `KEY <value>` (case-insensitive), value trimmed. */
function readIdentifier(text: string, key: string, pattern: string): string | null {
    const re = new RegExp(`\\b${escapeForRegex(key)}\\s*[:=]?\\s*(${pattern})`, 'i');
    const match = text.match(re);
    return match?.[1]?.trim() ?? null;
}

function normalizeCode(value: string): string | null {
    const normalized = value.trim().toLowerCase();
    return IDENTIFIER_RE.test(normalized) ? normalized : null;
}

function parseQuantity(raw: string): number | null {
    // Accept "1.234,5" (European) and "1,234.5"/"12" (plain) shapes.
    let value = raw.replace(/\s/g, '');
    const hasComma = value.includes(',');
    const hasDot = value.includes('.');
    if (hasComma && hasDot) {
        // Whichever separator appears last is the decimal separator.
        value = value.lastIndexOf(',') > value.lastIndexOf('.')
            ? value.replace(/\./g, '').replace(',', '.')
            : value.replace(/,/g, '');
    } else if (hasComma) {
        value = value.replace(',', '.');
    }

    const quantity = Number(value);
    if (!Number.isFinite(quantity)) return null;
    if (quantity <= 0 || quantity > FIELD_REPORT_MAX_QUANTITY) return null;
    // The column is NUMERIC(15,4).
    return Math.round(quantity * 10_000) / 10_000;
}

/**
 * Parses an inbound field report. Returns either a fully identified draft (the
 * caller still has to resolve project/metric against the database and quarantine
 * whatever it cannot resolve) or a specific error describing what was missing.
 */
export function parseFieldReport(text: string | null | undefined): FieldReportParseResult {
    const rawText = (text ?? '').trim().replace(/\s+/g, ' ');
    if (!rawText) {
        return {
            ok: false,
            code: 'empty',
            missing: [],
            message: `Empty message. Send: ${FIELD_REPORT_GUIDANCE}`,
        };
    }

    const invalid: string[] = [];
    const missing: string[] = [];

    const rawProject = readIdentifier(rawText, 'PROJECT', '[^\\s,;]+');
    const rawMetric = readIdentifier(rawText, 'METRIC', '[^\\s,;]+');
    const rawValue = readIdentifier(rawText, 'VALUE', '-?[0-9][0-9.,\\s]*')
        ?? readIdentifier(rawText, 'QTY', '-?[0-9][0-9.,\\s]*')
        ?? readIdentifier(rawText, 'QUANTITY', '-?[0-9][0-9.,\\s]*')
        ?? readIdentifier(rawText, 'COUNT', '-?[0-9][0-9.,\\s]*');
    const rawLocation = readIdentifier(rawText, 'LOCATION', '[^,;]+')
        ?? readIdentifier(rawText, 'SITE', '[^,;]+')
        ?? readIdentifier(rawText, 'AT', '[^,;]+');

    if (!rawProject) missing.push('PROJECT');
    if (!rawMetric) missing.push('METRIC');
    if (!rawValue) missing.push('VALUE');
    if (!rawLocation) missing.push('LOCATION');

    const projectCode = rawProject ? normalizeCode(rawProject) : null;
    const metricCode = rawMetric ? normalizeCode(rawMetric) : null;
    if (rawProject && !projectCode) invalid.push('PROJECT');
    if (rawMetric && !metricCode) invalid.push('METRIC');

    const quantity = rawValue ? parseQuantity(rawValue) : null;

    if (missing.length > 0) {
        return {
            ok: false,
            code: 'missing_fields',
            missing,
            message: `Missing ${missing.join(', ')}. Send: ${FIELD_REPORT_GUIDANCE}`,
        };
    }

    if (quantity === null) {
        return {
            ok: false,
            code: 'invalid_value',
            missing: ['VALUE'],
            message: `VALUE must be a positive number. Send: ${FIELD_REPORT_GUIDANCE}`,
        };
    }

    if (invalid.length > 0 || !projectCode || !metricCode || !rawLocation) {
        return {
            ok: false,
            code: 'invalid_identifier',
            missing: invalid,
            message: `Invalid ${invalid.join(', ') || 'identifier'}. Send: ${FIELD_REPORT_GUIDANCE}`,
        };
    }

    // NOTE and DATE are matched with regex *literals* rather than through
    // `readIdentifier`: the string-literal form silently drops the backslash on
    // `\s` (an unrecognized string escape resolves to a literal 's'), so the
    // previous NOTE pattern never matched the " DATE=" boundary and leaked the
    // date into the note. Regex literals keep `\s`/`\d`/`\b` as real regex
    // escapes (audit Wave 0 confirmation).
    const noteIdx = rawText.search(/\bNOTE\s*[:=]?\s*/i);
    const note =
        noteIdx === -1
            ? null
            : rawText
                  .slice(noteIdx)
                  .replace(/^\w+\s*[:=]?\s*/i, '')
                  .replace(/\s+DATE\s*[:=].*$/i, '')
                  .trim() || null;
    const rawDate = rawText.match(/\bDATE\s*[:=]?\s*(\d{4}-\d{2}-\d{2})/i)?.[1] ?? null;
    const reportedAt = rawDate && !Number.isNaN(Date.parse(rawDate)) ? rawDate : null;

    return {
        ok: true,
        projectCode,
        metricCode,
        quantity,
        location: rawLocation.trim(),
        note: note?.trim() || null,
        reportedAt,
        rawText,
    };
}

