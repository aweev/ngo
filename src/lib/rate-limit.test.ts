import { afterEach, describe, expect, it, vi } from 'vitest';

// Only the pure sliding-window logic is under test; the module also exposes
// request-scoped helpers (getClientIp/enforceRateLimit) that need Next's
// request context, which does not exist in this environment.
vi.mock('next/headers', () => ({
    headers: async () => new Map<string, string>(),
}));

import { RATE_LIMITS, checkRateLimit } from '@/lib/rate-limit';

afterEach(() => {
    vi.useRealTimers();
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
