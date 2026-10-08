/**
 * Reliability helpers for Supabase Edge Functions (audit Wave 3).
 *
 * Plain module (no 'use server' semantics here — Deno runtime): structured
 * JSON logs, deterministic exponential backoff, and lease/claim helpers.
 * The app-side mirror lives in src/lib/reliability.ts (unit-tested there).
 */

export type LogLevel = "info" | "warn" | "error";

/** One-line structured JSON log — greppable and SIEM-friendly. */
export function logEvent(level: LogLevel, event: string, fields: Record<string, unknown> = {}): void {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields }));
}

/**
 * Deterministic exponential backoff: min(base * 2^(attempt-1), max) in ms.
 * attempt is 1-based; invalid input falls back to the base delay.
 */
export function backoffMs(attempt: number, baseMs = 5_000, maxMs = 30 * 60_000): number {
    if (!Number.isFinite(attempt) || attempt < 1) return baseMs;
    return Math.min(baseMs * 2 ** (Math.floor(attempt) - 1), maxMs);
}

/** ISO timestamp when the next attempt for `attempt` should become due. */
export function nextAttemptIso(attempt: number, baseMs = 5_000, maxMs = 30 * 60_000): string {
    return new Date(Date.now() + backoffMs(attempt, baseMs, maxMs)).toISOString();
}

export interface SiblingResult {
    ok: boolean;
    status: number;
    error?: string;
}

/**
 * POST to another Supabase Edge Function of THIS project (never an arbitrary
 * URL — the caller builds the URL from its own function host only).
 * Never throws: failures come back as { ok: false } so callers must branch
 * on `.ok` before recording success (the old cron swallowed these).
 */
export async function postSibling(
    supabaseUrl: string,
    functionName: string,
    cronSecret: string,
    body: unknown,
    timeoutMs = 10_000,
): Promise<SiblingResult> {
    try {
        const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: cronSecret,
                Authorization: `Bearer ${cronSecret}`,
            },
            body: JSON.stringify(body ?? {}),
            signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.ok) return { ok: true, status: res.status };
        const text = (await res.text()).slice(0, 500);
        return { ok: false, status: res.status, error: `HTTP ${res.status}: ${text}` };
    } catch (err) {
        return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
    }
}
