/**
 * Idempotency helpers (audit Wave 3: idempotency everywhere).
 *
 * Rule: every side-effecting entry point (payments, webhooks, emails,
 * imports, field sync) derives a stable key from its natural identity and
 * passes it to the storage layer's unique constraint. Duplicates return the
 * original outcome and NEVER execute twice.
 */

/** Joins key parts, skipping empty segments so keys stay readable. */
export function buildIdempotencyKey(...parts: Array<string | number | null | undefined>): string {
    return parts
        .map((p) => (p === null || p === undefined ? '' : String(p).trim()))
        .filter((p) => p.length > 0)
        .join(':');
}

/** Stable SHA-256 hex digest of a canonical JSON payload (Web Crypto). */
export async function payloadDigest(payload: unknown): Promise<string> {
    const canonical = JSON.stringify(payload ?? {});
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parses an idempotency conflict: Postgres unique violation (23505) means
 * "already processed" — callers translate that into { duplicate: true }
 * instead of an error. Returns true when the error IS such a conflict.
 */
export function isIdempotencyConflict(error: { code?: string } | null | undefined): boolean {
    return error?.code === '23505';
}

export type IdempotentOutcome<T> =
    | { duplicate: false; value: T }
    | { duplicate: true; value?: undefined };

/**
 * Runs `execute` once per key. Concurrent duplicates collapse onto the
 * first in-flight promise instead of double-executing (per-process guard;
 * the database unique constraint remains the cross-process authority).
 */
const inflight = new Map<string, Promise<unknown>>();

export async function dedupeInflight<T>(key: string, execute: () => Promise<T>): Promise<IdempotentOutcome<T>> {
    const existing = inflight.get(key);
    if (existing) {
        await existing.catch(() => undefined);
        return { duplicate: true };
    }
    const promise = execute();
    inflight.set(key, promise.catch(() => undefined));
    try {
        const value = await promise;
        return { duplicate: false, value };
    } finally {
        inflight.delete(key);
    }
}
