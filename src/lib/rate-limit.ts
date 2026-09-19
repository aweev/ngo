import { headers } from 'next/headers';

/**
 * Lightweight in-memory sliding-window rate limiter for public intake
 * server actions (contact/safeguarding/corporate forms, newsletter,
 * donation pledges, checkout creation).
 *
 * Best-effort by design: state lives per server instance and resets on
 * redeploy. It stops naive spam, replay loops, and accidental retries;
 * durable multi-instance protection should additionally be layered at the
 * edge (WAF / CDN rate rules) or moved to a shared store when needed.
 */
const buckets = new Map<string, number[]>();

/** Allowed requests per window for each public intake surface. */
export const RATE_LIMITS = {
    form: 6,
    newsletter: 4,
    donation: 8,
    checkout: 8,
} as const;

export type RateLimitSurface = keyof typeof RATE_LIMITS;

const WINDOW_MS = 60_000;

export function checkRateLimit(
    surface: RateLimitSurface,
    identity: string,
    windowMs = WINDOW_MS,
): { ok: boolean; retryAfterSeconds: number } {
    const key = `${surface}:${identity}`;
    const now = Date.now();
    const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

    if (hits.length >= RATE_LIMITS[surface]) {
        const oldest = hits[0];
        return {
            ok: false,
            retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)),
        };
    }

    hits.push(now);
    buckets.set(key, hits);

    // Opportunistic cleanup so the map cannot grow unbounded.
    if (buckets.size > 10_000) {
        for (const [k, v] of buckets) {
            if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
        }
    }

    return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort client identity for rate limiting (proxy-aware). */
export async function getClientIp(): Promise<string> {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return h.get('x-real-ip') ?? 'unknown';
}

/** Combined guard: returns a friendly error when the caller is throttled. */
export async function enforceRateLimit(
    surface: RateLimitSurface,
): Promise<{ ok: true } | { ok: false; error: string }> {
    const ip = await getClientIp();
    const result = checkRateLimit(surface, ip);
    if (result.ok) return { ok: true };
    return {
        ok: false,
        error: `Too many requests. Please wait ${result.retryAfterSeconds}s and try again.`,
    };
}