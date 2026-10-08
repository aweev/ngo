/**
 * Per-tenant quota helpers (audit Wave 3: fairness, no global starvation).
 *
 * Claim RPCs cap rows per org inside one batch; this module is the
 * app-side counterpart: read a tenant's quota, check hourly outbox volume,
 * and decide whether a worker should serve the tenant right now.
 */

export interface TenantQuota {
    organizationId: string;
    maxClaimPerRun: number;
    maxOutboxPerHour: number;
    suspendedUntil: string | null;
    suspendReason: string | null;
}

export const DEFAULT_QUOTA: Omit<TenantQuota, 'organizationId'> = {
    maxClaimPerRun: 5,
    maxOutboxPerHour: 1000,
    suspendedUntil: null,
    suspendReason: null,
};

export function isTenantSuspended(quota: Pick<TenantQuota, 'suspendedUntil'>, now = new Date()): boolean {
    if (!quota.suspendedUntil) return false;
    return new Date(quota.suspendedUntil).getTime() > now.getTime();
}

/** True when the tenant's hourly outbox volume is within quota. */
export function withinOutboxQuota(eventCountLastHour: number, quota: Pick<TenantQuota, 'maxOutboxPerHour'>): boolean {
    return eventCountLastHour < quota.maxOutboxPerHour;
}

/** Effective per-org claim cap: quota wins, clamped to [1, 100]. */
export function effectiveClaimCap(quota: Pick<TenantQuota, 'maxClaimPerRun'>, requested: number): number {
    const cap = Math.min(quota.maxClaimPerRun, requested);
    return Math.min(100, Math.max(1, cap));
}
