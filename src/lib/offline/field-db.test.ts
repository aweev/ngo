import { beforeEach, describe, expect, it } from 'vitest';

import {
    __resetMemoryStore,
    clearDraft,
    enqueueFieldOp,
    listFieldOps,
    loadDraft,
    markOpFailed,
    removeFieldOps,
    retryFieldOp,
    saveDraft,
} from '@/lib/offline/field-db';
import { classifyResults, isSyncTerminal, nextBatch, selectSyncBatch } from '@/lib/offline/sync-engine';
import type { StoredFieldOp } from '@/lib/offline/field-db';

function op(id: string, attempts = 0, userId?: string | null): StoredFieldOp {
    return {
        offline_uuid: id,
        kind: 'beneficiary',
        idempotency_key: `key-${id}`,
        payload: { full_name: 'Test Person' },
        user_id: userId ?? null,
        attempts,
        created_at: Date.now(),
    };
}

function enqueueInput(id: string) {
    return {
        offline_uuid: id,
        kind: 'beneficiary' as const,
        idempotency_key: `key-${id}`,
        payload: { full_name: 'Test Person' },
    };
}

describe('field offline outbox (memory fallback)', () => {
    beforeEach(() => {
        __resetMemoryStore();
    });

    it('queues and lists operations in FIFO order', async () => {
        await enqueueFieldOp(enqueueInput('a'));
        await enqueueFieldOp(enqueueInput('b'));
        const ops = await listFieldOps();
        expect(ops.map((o) => o.offline_uuid)).toEqual(['a', 'b']);
    });

    it('refuses oversized payloads instead of silently truncating', async () => {
        await expect(
            enqueueFieldOp({
                offline_uuid: 'big',
                kind: 'beneficiary',
                idempotency_key: 'key-big',
                payload: { blob: 'x'.repeat(300 * 1024) },
            }),
        ).rejects.toThrow(/too large/);
        expect(await listFieldOps()).toEqual([]);
    });

    it('removes acknowledged items and tracks failures', async () => {
        await enqueueFieldOp({ offline_uuid: 'a', kind: 'service', idempotency_key: 'k-a', payload: {} });
        await enqueueFieldOp({ offline_uuid: 'b', kind: 'service', idempotency_key: 'k-b', payload: {} });
        await removeFieldOps(['a']);
        await markOpFailed('b', 'Server rejected this record.');
        const ops = await listFieldOps();
        expect(ops).toHaveLength(1);
        expect(ops[0].attempts).toBe(1);
        expect(ops[0].last_error).toBe('Server rejected this record.');
    });

    it('round-trips form drafts for crash recovery', async () => {
        await saveDraft('register-household', { head_name: 'Amina' });
        expect(await loadDraft('register-household')).toEqual({ head_name: 'Amina' });
        await clearDraft('register-household');
        expect(await loadDraft('register-household')).toBeNull();
    });

    it('stamps the queuing officer on the op (per-officer binding)', async () => {
        await enqueueFieldOp({ ...enqueueInput('a'), user_id: 'officer-1' });
        const ops = await listFieldOps();
        expect(ops[0].user_id).toBe('officer-1');
    });

    it('retryFieldOp resets the failure counter and clears the error', async () => {
        await enqueueFieldOp(enqueueInput('a'));
        for (let i = 0; i < 8; i += 1) await markOpFailed('a', 'Network timeout.');
        expect((await listFieldOps())[0].attempts).toBe(8);
        await retryFieldOp('a');
        const [reset] = await listFieldOps();
        expect(reset.attempts).toBe(0);
        expect(reset.last_error).toBeNull();
        expect(isSyncTerminal(reset)).toBe(false);
    });
});

describe('sync engine classification', () => {
    it('acknowledges synced and duplicate items, keeps errors queued', () => {
        const outcome = classifyResults([
            { offline_uuid: 'a', status: 'synced', entity_id: '1' },
            { offline_uuid: 'b', status: 'duplicate', entity_id: '2', message: 'Possible match' },
            { offline_uuid: 'c', status: 'error', message: 'Bad payload' },
        ]);
        expect(outcome.acknowledged).toEqual(['a', 'b']);
        expect(outcome.failed).toEqual({ c: 'Bad payload' });
        expect(outcome.notices).toHaveLength(1);
    });

    it('parks items after 8 attempts for human review', () => {
        expect(isSyncTerminal(op('x', 8))).toBe(true);
        expect(isSyncTerminal(op('y', 7))).toBe(false);
        expect(nextBatch([op('x', 8), op('y')]).map((o) => o.offline_uuid)).toEqual(['y']);
    });

    it('exhausting the whole queue leaves an empty batch (no infinite retry)', () => {
        const all = Array.from({ length: 3 }, (_, i) => op(`t${i}`, 8));
        expect(nextBatch(all)).toEqual([]);
    });
});

describe('per-officer queue binding (selectSyncBatch)', () => {
    it('never pushes another officer\'s ops', () => {
        const plan = selectSyncBatch([op('mine', 0, 'me'), op('theirs', 0, 'colleague')], 'me');
        expect(plan.batch.map((o) => o.offline_uuid)).toEqual(['mine']);
        expect(plan.locked.map((o) => o.offline_uuid)).toEqual(['theirs']);
    });

    it('treats unbound (legacy) ops as pushable by anyone', () => {
        const plan = selectSyncBatch([op('old')], 'me');
        expect(plan.batch.map((o) => o.offline_uuid)).toEqual(['old']);
        expect(plan.locked).toEqual([]);
    });

    it('keeps terminal ops out of the batch even when owned', () => {
        const plan = selectSyncBatch([op('mine', 8, 'me')], 'me');
        expect(plan.batch).toEqual([]);
        expect(plan.locked).toEqual([]);
    });

    it('locks nothing when no user is bound to the session', () => {
        const plan = selectSyncBatch([op('a', 0, 'colleague')], null);
        expect(plan.batch.map((o) => o.offline_uuid)).toEqual(['a']);
        expect(plan.locked).toEqual([]);
    });
});
