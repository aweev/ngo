import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    MAX_PAYLOAD_BYTES,
    MAX_RETRY_COUNT,
    belongsToSession,
    isReadyForAttempt,
    isTerminalFailure,
    nextRetryDelayMs,
    sanitizeQueuedPayload,
    useOfflineSyncStore,
    type QueuedMutation,
} from '@/store/use-offline-sync-store';

/**
 * Offline queue unit layer (audit Wave 2 / P1 "offline is a trust risk").
 * The critical regression under test: queued work must never be reported as
 * sent when nothing actually sent it.
 */

function makeItem(overrides: Partial<QueuedMutation> = {}): QueuedMutation {
    return {
        id: 'sync-1',
        actionName: 'submitFieldReport',
        payload: {},
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
        ...overrides,
    };
}

beforeEach(() => {
    useOfflineSyncStore.setState({
        queue: [],
        isSyncing: false,
        isOnline: true,
        session: {},
        deviceId: 'device-test',
        lastSyncAt: null,
    });
});

describe('sanitizeQueuedPayload', () => {
    it('keeps ordinary field payloads intact', () => {
        expect(sanitizeQueuedPayload({ project: 'water', count: 12 })).toEqual({ project: 'water', count: 12 });
    });

    it('drops credential-shaped keys before persistence', () => {
        const safe = sanitizeQueuedPayload({
            reportId: 'r1',
            password: 'hunter2',
            accessToken: 'abc',
            authorization: 'Bearer x',
            card_number: '4111',
            csrfToken: 't',
        });
        expect(safe).toEqual({ reportId: 'r1' });
    });

    it('refuses oversized payloads instead of storing them', () => {
        const huge = { note: 'x'.repeat(MAX_PAYLOAD_BYTES + 1) };
        expect(() => sanitizeQueuedPayload(huge)).toThrow(/exceeds/);
    });
});

describe('nextRetryDelayMs', () => {
    it('backs off exponentially and caps the delay', () => {
        expect(nextRetryDelayMs(1)).toBe(2_000);
        expect(nextRetryDelayMs(2)).toBe(4_000);
        expect(nextRetryDelayMs(3)).toBe(8_000);
        expect(nextRetryDelayMs(20)).toBe(5 * 60_000);
    });
});

describe('failure and backoff gates', () => {
    it('treats exhausted retries as terminal', () => {
        expect(isTerminalFailure(makeItem({ retryCount: MAX_RETRY_COUNT - 1 }))).toBe(false);
        expect(isTerminalFailure(makeItem({ retryCount: MAX_RETRY_COUNT }))).toBe(true);
    });

    it('allows an immediate attempt only before the first try', () => {
        expect(isReadyForAttempt(makeItem(), 1_000)).toBe(true);
        const attempted = makeItem({ retryCount: 1, lastAttemptAt: 1_000 });
        expect(isReadyForAttempt(attempted, 1_500)).toBe(false);
        expect(isReadyForAttempt(attempted, 3_000)).toBe(true);
    });

    it('never retries a terminal failure', () => {
        const terminal = makeItem({ retryCount: MAX_RETRY_COUNT, lastAttemptAt: 0 });
        expect(isReadyForAttempt(terminal, 10_000_000)).toBe(false);
    });
});

describe('belongsToSession', () => {
    it('accepts unbound legacy items', () => {
        expect(belongsToSession(makeItem(), { userId: 'u1', deviceId: 'd1' })).toBe(true);
    });

    it('accepts the queue of the signed-in user on the same device', () => {
        const item = makeItem({ userId: 'u1', deviceId: 'd1' });
        expect(belongsToSession(item, { userId: 'u1', deviceId: 'd1' })).toBe(true);
    });

    it('rejects another user or another device', () => {
        const item = makeItem({ userId: 'u1', deviceId: 'd1' });
        expect(belongsToSession(item, { userId: 'u2', deviceId: 'd1' })).toBe(false);
        expect(belongsToSession(item, { userId: 'u1', deviceId: 'd2' })).toBe(false);
    });
});

describe('useOfflineSyncStore queue behaviour', () => {
    it('stamps queued items with explicit status, device and hardened payload', () => {
        const id = useOfflineSyncStore
            .getState()
            .enqueueMutation('submitFieldReport', { count: 3, password: 'x' });

        const [item] = useOfflineSyncStore.getState().queue;
        expect(item.id).toBe(id);
        expect(item.status).toBe('pending');
        expect(item.deviceId).toBe('device-test');
        expect(item.payload).toEqual({ count: 3 });
    });

    it('never reports queued work as sent when no transport exists', async () => {
        const id = useOfflineSyncStore.getState().enqueueMutation('submitFieldReport', { count: 3 });

        await useOfflineSyncStore.getState().syncPendingMutations();

        const queue = useOfflineSyncStore.getState().queue;
        expect(queue).toHaveLength(1); // data preserved, never silently dropped
        expect(queue[0].id).toBe(id);
        expect(queue[0].status).toBe('failed');
        expect(queue[0].lastError).toContain('No sync executor');
        expect(queue[0].retryCount).toBe(1);
    });

    it('only drops an item once the executor acknowledges it', async () => {
        useOfflineSyncStore.getState().enqueueMutation('submitFieldReport', { count: 1 });

        const executor = vi.fn().mockResolvedValue(true);
        await useOfflineSyncStore.getState().syncPendingMutations(executor);

        expect(executor).toHaveBeenCalledTimes(1);
        expect(useOfflineSyncStore.getState().queue).toHaveLength(0);
    });

    it('keeps failed items with a readable reason', async () => {
        useOfflineSyncStore.getState().enqueueMutation('submitFieldReport', { count: 1 });

        await useOfflineSyncStore.getState().syncPendingMutations(vi.fn().mockResolvedValue(false));

        const [item] = useOfflineSyncStore.getState().queue;
        expect(item.status).toBe('failed');
        expect(item.lastError).toBe('Executor reported failure.');
    });

    it('refuses to send a queue belonging to another user', async () => {
        useOfflineSyncStore.setState({ session: { userId: 'user-a', deviceId: 'device-test' } });
        useOfflineSyncStore.getState().enqueueMutation('submitFieldReport', { count: 1 });

        useOfflineSyncStore.setState({ session: { userId: 'user-b', deviceId: 'device-test' } });
        const executor = vi.fn().mockResolvedValue(true);
        await useOfflineSyncStore.getState().syncPendingMutations(executor);

        expect(executor).not.toHaveBeenCalled();
        const [item] = useOfflineSyncStore.getState().queue;
        expect(item.status).toBe('failed');
        expect(item.lastError).toContain('different user');
    });

    it('does nothing while offline', async () => {
        useOfflineSyncStore.getState().enqueueMutation('submitFieldReport', { count: 1 });
        useOfflineSyncStore.setState({ isOnline: false });

        const executor = vi.fn().mockResolvedValue(true);
        await useOfflineSyncStore.getState().syncPendingMutations(executor);

        expect(executor).not.toHaveBeenCalled();
        expect(useOfflineSyncStore.getState().queue[0].status).toBe('pending');
    });
});
