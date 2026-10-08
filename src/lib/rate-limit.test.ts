import { afterEach, describe, expect, it, vi } from 'vitest';

// Only the pure sliding-window logic is under test; the module also exposes
// request-scoped helpers (getClientIp/enforceRateLimit) that need Next's
// request context, which does not exist in this environment.
vi.mock('next/headers', () => ({
    headers: async () => new Map<string, string>(),
}));

import { RATE_LIMITS, checkRateLimit, clientIpFromHeaders } from '@/lib/rate-limit';

afterEach(() => {
    vi.useRealTimers();
    delete process.env.TRUSTED_PROXY_HOPS;
    delete process.env.TRUST_PROXY_REAL_IP;
});

describe('checkRateLimit', () => {
    it('allows up to the configured limit, then blocks with a retry hint', () => {
        const limit = RATE_LIMITS.newsletter;
        for (let i = 0; i < limit; i += 1) {
            expect(checkRateLimit('newsletter', 'ip-1').ok).toBe(true);
        }
        const blocked = checkRateLimit('newsletter', 'ip-1');
        expect(blocked.ok).toBe(false);
        expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
        expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
    });

    it('keys buckets per identity and per surface', () => {
        for (let i = 0; i < RATE_LIMITS.form; i += 1) checkRateLimit('form', 'ip-2');

        expect(checkRateLimit('form', 'ip-2').ok).toBe(false); // same identity exhausted
        expect(checkRateLimit('form', 'ip-3').ok).toBe(true); // other identity unaffected
        expect(checkRateLimit('donation', 'ip-2').ok).toBe(true); // other surface unaffected
    });

    it('frees capacity once the window elapses', () => {
        vi.useFakeTimers();
        for (let i = 0; i < RATE_LIMITS.checkout; i += 1) checkRateLimit('checkout', 'ip-4');
        expect(checkRateLimit('checkout', 'ip-4').ok).toBe(false);

        vi.advanceTimersByTime(61_000);
        expect(checkRateLimit('checkout', 'ip-4').ok).toBe(true);
    });

    it('exposes a limit for every public intake surface', () => {
        for (const limit of Object.values(RATE_LIMITS)) {
            expect(limit).toBeGreaterThan(0);
        }
    });
});

describe('clientIpFromHeaders', () => {
    it('never trusts x-forwarded-for without declared trusted proxies', () => {
        expect(clientIpFromHeaders('203.0.113.9, 10.0.0.1', null)).toBe('unknown');
        expect(clientIpFromHeaders('203.0.113.9', '198.51.100.7')).toBe('unknown');
    });

    it('takes the entry added by the trusted proxy hop', () => {
        process.env.TRUSTED_PROXY_HOPS = '1';
        expect(clientIpFromHeaders('203.0.113.9, 10.0.0.1', null)).toBe('10.0.0.1');
    });

    it('walks back one entry per trusted hop', () => {
        process.env.TRUSTED_PROXY_HOPS = '2';
        expect(clientIpFromHeaders('203.0.113.9, 10.0.0.1, 10.0.0.2', null)).toBe('10.0.0.1');
    });

    it('ignores spoofed entries to the left of the trusted hops', () => {
        process.env.TRUSTED_PROXY_HOPS = '1';
        // The attacker prepends fake hops; only the edge-appended entry counts.
        expect(clientIpFromHeaders('1.2.3.4, 5.6.7.8, 10.0.0.1', null)).toBe('10.0.0.1');
    });

    it('honors x-real-ip only when the operator opts in', () => {
        process.env.TRUST_PROXY_REAL_IP = 'true';
        expect(clientIpFromHeaders(null, '198.51.100.7')).toBe('198.51.100.7');
        delete process.env.TRUST_PROXY_REAL_IP;
        expect(clientIpFromHeaders(null, '198.51.100.7')).toBe('unknown');
    });
});
