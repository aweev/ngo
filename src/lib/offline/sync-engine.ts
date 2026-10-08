/**
 * Field sync engine (Phase 1.2) — pure orchestration over injected transports.
 *
 * The engine never touches the network directly: the field UI injects
 * push/pull functions (server actions when online). That keeps this module
 * unit-testable and honest — an item leaves the outbox only on a per-item
 * server acknowledgement, never on "we tried".
 */
import type { SyncItemResult } from '@/actions/field-sync';
import type { StoredFieldOp } from '@/lib/offline/field-db';

/** After this many failed pushes an item waits for a human, not a retry. */
export const MAX_SYNC_ATTEMPTS = 8;

export interface PushTransport {
    (input: {
        operations: Array<{
            kind: StoredFieldOp['kind'];
            offline_uuid: string;
            idempotency_key: string;
            base_updated_at?: string | null;
            payload: Record<string, unknown>;
        }>;
        device_id?: string | null;
    }): Promise<{ data: SyncItemResult[] | null; error: string | null }>;
}

export interface SyncOutcome {
    /** Offline UUIDs acknowledged (synced OR duplicate-flagged server-side). */
    acknowledged: string[];
    /** UUID -> human message for items that stay queued. */
    failed: Record<string, string>;
    /** Notices for duplicates that need a merge decision. */
    notices: Array<{ offline_uuid: string; message: string }>;
}

/**
 * Classifies one batch result. Duplicates are acknowledged (the record
 * EXISTS server-side) but surface a merge notice — the data is never lost,
 * the decision is deferred to a human.
 */
export function classifyResults(results: SyncItemResult[]): SyncOutcome {
    const outcome: SyncOutcome = { acknowledged: [], failed: {}, notices: [] };
    for (const r of results) {
        if (r.status === 'synced') {
            outcome.acknowledged.push(r.offline_uuid);
        } else if (r.status === 'duplicate') {
            outcome.acknowledged.push(r.offline_uuid);
            outcome.notices.push({
                offline_uuid: r.offline_uuid,
                message: r.message ?? 'Possible duplicate needs review.',
            });
        } else if (r.status === 'conflict') {
            outcome.acknowledged.push(r.offline_uuid);
            outcome.notices.push({
                offline_uuid: r.offline_uuid,
                message: r.message ?? 'Server version changed — review the conflict.',
            });
        } else {
            outcome.failed[r.offline_uuid] = r.message ?? 'Server rejected this record.';
        }
    }
    return outcome;
}

/** True when an item exhausted its attempts and needs human review. */
export function isSyncTerminal(op: StoredFieldOp): boolean {
    return op.attempts >= MAX_SYNC_ATTEMPTS;
}

/** FIFO batch of items that still deserve an attempt. */
export function nextBatch(ops: StoredFieldOp[], size = 25): StoredFieldOp[] {
    return ops.filter((op) => !isSyncTerminal(op)).slice(0, Math.max(1, size));
}
