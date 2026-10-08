/**
 * Reliability helpers (audit Wave 3): deterministic exponential backoff and
 * transactional-outbox enqueueing. The Edge Function mirror lives in
 * supabase/functions/_shared/reliability.ts; behavior is unit-tested here.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Deterministic exponential backoff: min(base * 2^(attempt-1), max) in ms.
 * `attempt` is 1-based; invalid input falls back to the base delay.
 */
export function computeBackoffMs(attempt: number, baseMs = 5_000, maxMs = 30 * 60_000): number {
    if (!Number.isFinite(attempt) || attempt < 1) return baseMs;
    return Math.min(baseMs * 2 ** (Math.floor(attempt) - 1), maxMs);
}

/** ISO timestamp when attempt N of a retryable job should run next. */
export function nextAttemptAt(attempt: number, baseMs = 5_000, maxMs = 30 * 60_000): string {
    return new Date(Date.now() + computeBackoffMs(attempt, baseMs, maxMs)).toISOString();
}

/** Stable idempotency key: same event type + payload ⇒ same key, forever. */
export async function outboxIdempotencyKey(eventType: string, payload: unknown): Promise<string> {
    const canonical = JSON.stringify(payload ?? {});
    const digest = await globalThis.crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(canonical),
    );
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${eventType}:${hex}`;
}

export interface OutboxEnqueueInput {
    organizationId: string;
    eventType: string;
    payload: Record<string, unknown>;
    /** Defaults to outboxIdempotencyKey(eventType, payload). */
    idempotencyKey?: string;
}

export interface OutboxEnqueueResult {
    queued: boolean;
    duplicate: boolean;
    error?: string;
}

/**
 * Enqueues one event in the tenant's transactional outbox. Safe to call on
 * the happy path of a mutation: a duplicate idempotency key is reported as
 * { queued: false, duplicate: true } and NEVER throws.
 */
export async function enqueueOutboxEvent(
    supabase: SupabaseClient,
    input: OutboxEnqueueInput,
): Promise<OutboxEnqueueResult> {
    const idempotencyKey = input.idempotencyKey ?? (await outboxIdempotencyKey(input.eventType, input.payload));
    const { error } = await supabase.from('outbox_events').insert({
        organization_id: input.organizationId,
        event_type: input.eventType,
        payload: input.payload,
        idempotency_key: idempotencyKey,
    });
    if (!error) return { queued: true, duplicate: false };
    if (error.code === '23505') return { queued: false, duplicate: true };
    return { queued: false, duplicate: false, error: error.message };
}
