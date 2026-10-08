import { describe, expect, it } from 'vitest';
import { DEFAULT_QUOTA, effectiveClaimCap, isTenantSuspended, withinOutboxQuota } from '@/lib/quotas';

describe('tenant quotas', () => {
    it('defaults to serving 5 rows per run and 1000 outbox events per hour', () => {
        expect(DEFAULT_QUOTA.maxClaimPerRun).toBe(5);
        expect(DEFAULT_QUOTA.maxOutboxPerHour).toBe(1000);
    });

    it('treats a future suspension as suspended and past/null as servable', () => {
        expect(isTenantSuspended({ suspendedUntil: new Date(Date.now() + 60_000).toISOString() })).toBe(true);
        expect(isTenantSuspended({ suspendedUntil: new Date(Date.now() - 60_000).toISOString() })).toBe(false);
        expect(isTenantSuspended({ suspendedUntil: null })).toBe(false);
    });

    it('rejects outbox volume at or above the hourly cap', () => {
        expect(withinOutboxQuota(999, { maxOutboxPerHour: 1000 })).toBe(true);
        expect(withinOutboxQuota(1000, { maxOutboxPerHour: 1000 })).toBe(false);
    });

    it('clamps the effective claim cap to [1, 100]', () => {
        expect(effectiveClaimCap({ maxClaimPerRun: 3 }, 25)).toBe(3);
        expect(effectiveClaimCap({ maxClaimPerRun: 50 }, 10)).toBe(10);
        expect(effectiveClaimCap({ maxClaimPerRun: 0 }, 10)).toBe(1);
        expect(effectiveClaimCap({ maxClaimPerRun: 500 }, 500)).toBe(100);
    });
});
