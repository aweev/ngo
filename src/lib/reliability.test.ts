import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    computeBackoffMs,
    enqueueOutboxEvent,
    nextAttemptAt,
    outboxIdempotencyKey,
} from '@/lib/reliability';

describe('computeBackoffMs', () => {
    it('doubles per attempt from the base delay', () => {
        expect(computeBackoffMs(1)).toBe(5_000);
        expect(computeBackoffMs(2)).toBe(10_000);
        expect(computeBackoffMs(3)).toBe(20_000);
    });

    it('caps at the maximum delay', () => {
        expect(computeBackoffMs(10)).toBe(30 * 60_000);
        expect(computeBackoffMs(1000)).toBe(30 * 60_000);
    });

    it('honours custom base and max', () => {
        expect(computeBackoffMs(1, 1_000, 4_000)).toBe(1_000);
        expect(computeBackoffMs(5, 1_000, 4_000)).toBe(4_000);
    });

    it('falls back to base for invalid attempts', () => {
        expect(computeBackoffMs(0)).toBe(5_000);
        expect(computeBackoffMs(-3)).toBe(5_000);
        expect(computeBackoffMs(Number.NaN)).toBe(5_000);
    });
});

describe('nextAttemptAt', () => {
    it('returns an ISO timestamp in the future', () => {
        const iso = nextAttemptAt(1, 5_000);
        const delay = new Date(iso).getTime() - Date.now();
        expect(delay).toBeGreaterThan(3_000);
        expect(delay).toBeLessThanOrEqual(5_100);
    });
});

describe('outboxIdempotencyKey', () => {
    it('is stable for identical payloads', async () => {
        const a = await outboxIdempotencyKey('content.locale_published', { pageId: 'p1', locale: 'de' });
        const b = await outboxIdempotencyKey('content.locale_published', { pageId: 'p1', locale: 'de' });
        expect(a).toBe(b);
        expect(a.startsWith('content.locale_published:')).toBe(true);
    });

    it('changes when the payload or event type changes', async () => {
        const a = await outboxIdempotencyKey('evt.a', { x: 1 });
        const b = await outboxIdempotencyKey('evt.a', { x: 2 });
        const c = await outboxIdempotencyKey('evt.b', { x: 1 });
        expect(new Set([a, b, c]).size).toBe(3);
    });
});

function stubClient(result: { error: { code?: string; message: string } | null }) {
    const insert = vi.fn(async (_row: Record<string, unknown>) => result);
    const client = { from: vi.fn(() => ({ insert })) };
    return { client: client as unknown as SupabaseClient, insert };
}

describe('enqueueOutboxEvent', () => {
    const input = {
        organizationId: 'org-1',
        eventType: 'content.locale_published',
        payload: { pageId: 'p1', locale: 'de' },
    };

    it('queues a new event', async () => {
        const { client, insert } = stubClient({ error: null });
        const res = await enqueueOutboxEvent(client, input);
        expect(res).toEqual({ queued: true, duplicate: false });
        const row = insert.mock.calls[0][0] as Record<string, unknown>;
        expect(row.organization_id).toBe('org-1');
        expect(row.event_type).toBe('content.locale_published');
        expect(String(row.idempotency_key)).toContain('content.locale_published:');
    });

    it('reports duplicates without throwing (23505)', async () => {
        const { client } = stubClient({ error: { code: '23505', message: 'duplicate key value' } });
        const res = await enqueueOutboxEvent(client, input);
        expect(res).toEqual({ queued: false, duplicate: true });
    });

    it('surfaces unexpected errors as a string', async () => {
        const { client } = stubClient({ error: { code: '42501', message: 'permission denied' } });
        const res = await enqueueOutboxEvent(client, input);
        expect(res.queued).toBe(false);
        expect(res.duplicate).toBe(false);
        expect(res.error).toBe('permission denied');
    });

    it('uses a caller-supplied idempotency key when provided', async () => {
        const { client, insert } = stubClient({ error: null });
        await enqueueOutboxEvent(client, { ...input, idempotencyKey: 'fixed-key' });
        const row = insert.mock.calls[0][0] as Record<string, unknown>;
        expect(row.idempotency_key).toBe('fixed-key');
    });
});
