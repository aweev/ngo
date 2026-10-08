import { headers } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { EDGE_SECRET_HEADER, alertAbuse, hashThrottleIdentity, verifyEdgeSecret } from '@/lib/abuse-prevention';

/**
 * Two-layer rate limiting for public intake server actions
 * (audit Wave 0, item 3).
 *
 * Layer 1 (primary): an atomic distributed fixed-window counter in Postgres
 * (`consume_rate_limit()`, migration 20260922000003_abuse_prevention.sql).
 * It is shared across every server instance and survives deploys — the
 * old in-memory Map reset on each release and could be bypassed by
 * rotating spoofed `x-forwarded-for` values.
 *
 * Layer 2 (fallback): the in-process sliding window below. It is used ONLY
 * when the database limiter is unreachable, so a Supabase outage degrades
 * protection instead of removing it.
 *
 * Identity: `x-forwarded-for` is trusted ONLY when the operator declares how
 * many trusted proxy hops sit in front of the app (TRUSTED_PROXY_HOPS). That
 * many entries are taken from the right of the header (the ones added by
 * trusted infrastructure). Without trusted proxies the header is fully
 * attacker-controlled and never used as an identity.
 */
const buckets = new Map<string, number[]>();

/**
 * Pure trusted-proxy resolution (exported for tests).
 *
 * Values appended by trusted proxies are counted from the RIGHT: with N
 * trusted hops the client address is the Nth entry from the right. Anything
 * further left was supplied by the client itself.
 */
export function clientIpFromHeaders(forwarded: string | null, realIp: string | null): string {
    const hops = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? '0', 10);
    if (Number.isFinite(hops) && hops > 0 && forwarded) {
        const parts = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
        const idx = parts.length - hops;
        if (idx >= 0 && parts[idx]) return parts[idx];
        return parts[0] ?? 'unknown';
    }
    // Without trusted proxies the only header we may honor is one the edge
    // platform is documented to set on the direct connection (x-real-ip),
    // and only when the operator opts in.
    if (process.env.TRUST_PROXY_REAL_IP === 'true' && realIp) return realIp;
    return 'unknown';
}


/** Allowed requests per window for each public intake surface. */
export const RATE_LIMITS = {
    form: 6,
    newsletter: 4,
    donation: 8,
    checkout: 8,
} as const;

export type RateLimitSurface = keyof typeof RATE_LIMITS;

const WINDOW_MS = 60_000;
const WINDOW_SECONDS = 60;

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

/** Best-effort client identity for rate limiting (trusted-proxy aware). */
export async function getClientIp(): Promise<string> {
    const h = await headers();
    return clientIpFromHeaders(h.get('x-forwarded-for'), h.get('x-real-ip'));
}

/**
 * Consumes one token from the shared Postgres counter.
 * Returns null when the distributed limiter is unavailable (missing service
 * key, function not yet migrated, database down) — the caller then falls
 * back to the in-process window instead of silently losing protection.
 */
async function consumeDistributed(
    surface: RateLimitSurface,
    identity: string,
): Promise<{ ok: boolean; retryAfterSeconds: number } | null> {
    if (process.env.RATE_LIMIT_MODE === 'memory_only') return null;
    try {
        const admin = createSupabaseAdminClient();
        const { data, error } = await admin.rpc('consume_rate_limit', {
            p_surface: surface,
            p_identity: identity,
            p_limit: RATE_LIMITS[surface],
            p_window_seconds: WINDOW_SECONDS,
        });
        if (error) {
            console.warn('[rate-limit] distributed limiter unavailable, using in-process window:', error.message);
            return null;
        }
        const row = Array.isArray(data) ? data[0] : data;
        if (!row || typeof (row as { allowed?: unknown }).allowed !== 'boolean') return null;
        const resolved = row as { allowed: boolean; retry_after_seconds?: number };
        return {
            ok: resolved.allowed,
            retryAfterSeconds: typeof resolved.retry_after_seconds === 'number' ? resolved.retry_after_seconds : 60,
        };
    } catch (err) {
        console.warn(
            '[rate-limit] distributed limiter unreachable, using in-process window:',
            err instanceof Error ? err.message : String(err),
        );
        return null;
    }
}

/** Combined guard: returns a friendly error when the caller is throttled. */
export interface RateLimitOptions {
    /**
     * Optional per-subject identity (email/phone). Throttles the subject
     * independently of the IP so one address cannot be spammed from many
     * hosts. Hashed before it reaches the counter table.
     */
    subject?: string;
    /**
     * Skip the CDN/WAF edge gate. Only for callers whose authenticity is
     * already proven another way (e.g. a signature-verified webhook).
     */
    skipEdgeGate?: boolean;
}

function throttled(retryAfterSeconds: number): { ok: false; error: string } {
    return {
        ok: false,
        error: `Too many requests. Please wait ${retryAfterSeconds}s and try again.`,
    };
}

/** Distributed counter first, in-process window as the degraded fallback. */
async function decide(
    surface: RateLimitSurface,
    identity: string,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
    const distributed = await consumeDistributed(surface, identity);
    if (distributed) return distributed;
    return checkRateLimit(surface, identity);
}

/**
 * Combined guard for public intake: edge gate -> per-IP limit -> optional
 * per-subject limit. Identities are pseudonymous (salted SHA-256) before they
 * reach the counter table, and every block raises a risk-scored abuse alert.
 */
export async function enforceRateLimit(
    surface: RateLimitSurface,
    options: RateLimitOptions = {},
): Promise<{ ok: true } | { ok: false; error: string }> {
    const h = await headers();
    const ip = clientIpFromHeaders(h.get('x-forwarded-for'), h.get('x-real-ip'));
    const ipIdentity = `ip:${hashThrottleIdentity(ip)}`;

    // 1. Edge gate ("apply CDN/WAF limits first").
    if (!options.skipEdgeGate) {
        const edge = verifyEdgeSecret(h.get(EDGE_SECRET_HEADER));
        if (!edge.ok) {
            await alertAbuse({ surface, identity: ipIdentity, signals: ['edge_gate_failed'] });
            return { ok: false, error: 'Request rejected. Please try again from the website.' };
        }
    }

    // 2. Per-IP window.
    const byIp = await decide(surface, ipIdentity);
    if (!byIp.ok) {
        await alertAbuse({ surface, identity: ipIdentity, signals: ['rate_limited'] });
        return throttled(byIp.retryAfterSeconds);
    }

    // 3. Per-subject (email/phone) throttle.
    const subject = options.subject?.trim();
    if (subject) {
        const subjectIdentity = `subject:${hashThrottleIdentity(subject)}`;
        const bySubject = await decide(surface, subjectIdentity);
        if (!bySubject.ok) {
            await alertAbuse({ surface, identity: subjectIdentity, signals: ['rate_limited'] });
            return throttled(bySubject.retryAfterSeconds);
        }
    }

    return { ok: true };
}