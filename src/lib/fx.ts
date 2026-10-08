/**
 * Foreign-exchange helpers (Phase 2.1).
 *
 * Conversion always uses an explicit dated rate — never a guess. When no rate
 * exists for the pair, conversion returns null and the caller must surface
 * "rate missing" instead of inventing a number.
 */
export interface RateRow {
    from_currency: string;
    to_currency: string;
    rate: number | string;
    rate_date: string;
}

function norm(code: string): string {
    return code.trim().toUpperCase();
}

/**
 * Latest rate on or before the given date. Returns null when the pair is
 * identical (rate 1 is exact) or no rate covers the date.
 */
export function findRate(
    rates: RateRow[],
    from: string,
    to: string,
    onOrBefore: string,
): number | null {
    const f = norm(from);
    const t = norm(to);
    if (f === t) return 1;
    const cutoff = onOrBefore.slice(0, 10);
    let best: { rate: number; date: string } | null = null;
    for (const r of rates) {
        if (norm(r.from_currency) !== f || norm(r.to_currency) !== t) continue;
        const d = r.rate_date.slice(0, 10);
        if (d > cutoff) continue;
        const rate = Number(r.rate);
        if (!Number.isFinite(rate) || rate <= 0) continue;
        if (!best || d > best.date) best = { rate, date: d };
    }
    return best?.rate ?? null;
}

/** Converts an amount, or null when no explicit rate exists. */
export function convertAmount(
    amount: number,
    from: string,
    to: string,
    rates: RateRow[],
    onOrBefore: string,
): number | null {
    const rate = findRate(rates, from, to, onOrBefore);
    if (rate === null) return null;
    return amount * rate;
}
