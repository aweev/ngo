import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Offline mutation queue (audit Wave 2 — field teams; P1 "offline is a trust
 * risk").
 *
 * The previous implementation reported a queued mutation as sent whenever no
 * executor existed, which could silently discard field data. Three rules now
 * hold:
 *   1. Nothing is ever reported as sent unless an executor or endpoint
 *      acknowledged it. With neither, the item stays queued as `failed` with a
 *      reason a human can read.
 *   2. Every item carries an explicit status plus the user/device that queued
 *      it, so another session cannot replay — or silently absorb — the queue.
 *   3. Payloads are hardened before they reach browser storage: credential-
 *      shaped keys are dropped and oversized payloads are refused.
 */

export type SyncStatus = 'pending' | 'failed';

export interface QueuedMutation {
    id: string;
    actionName: string;
    endpoint?: string;
    payload: Record<string, unknown>;
    timestamp: number;
    retryCount: number;
    lastError?: string;
    /** Explicit status — never inferred from a silent default. */
    status: SyncStatus;
    /** Session binding so another user/device cannot replay this queue. */
    userId?: string;
    deviceId?: string;
    /** Last attempt, used for exponential backoff between retries. */
    lastAttemptAt?: number;
}

export interface OfflineSession {
    userId?: string;
    deviceId?: string;
}

/** Keys that look like credentials are never persisted in browser storage. */
const SENSITIVE_KEY_PATTERN = /(password|passcode|secret|token|authorization|cookie|api[-_]?key|iban|card|cvv|ssn)/i;

/** Largest payload allowed into local storage, to bound storage abuse. */
export const MAX_PAYLOAD_BYTES = 32 * 1024;

/** After this many failed attempts an item waits for human review. */
export const MAX_RETRY_COUNT = 8;

/**
 * Pure payload hardening: drops credential-shaped keys and refuses payloads
 * above MAX_PAYLOAD_BYTES (throws, so the caller learns nothing was queued).
 */
export function sanitizeQueuedPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const safe: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload ?? {})) {
        if (SENSITIVE_KEY_PATTERN.test(key)) continue;
        safe[key] = value;
    }
    const encoded = JSON.stringify(safe) ?? '';
    if (encoded.length > MAX_PAYLOAD_BYTES) {
        throw new Error(`Offline payload exceeds ${MAX_PAYLOAD_BYTES} bytes and was not queued.`);
    }
    return safe;
}

/** Exponential backoff (2s, 4s, 8s … capped at 5 min) between attempts. */
export function nextRetryDelayMs(retryCount: number): number {
    const base = 2_000;
    const cap = 5 * 60_000;
    return Math.min(cap, base * 2 ** Math.max(0, retryCount - 1));
}

/** True when an item has exhausted its retries and needs a human. */
export function isTerminalFailure(item: QueuedMutation): boolean {
    return item.retryCount >= MAX_RETRY_COUNT;
}

/** Device/user binding: an item belongs to the session that queued it. */
export function belongsToSession(item: QueuedMutation, session: OfflineSession): boolean {
    if (!item.userId && !item.deviceId) return true;
    if (item.userId && session.userId && item.userId !== session.userId) return false;
    if (item.deviceId && session.deviceId && item.deviceId !== session.deviceId) return false;
    return true;
}

/** Backoff gate so a dead endpoint is not hammered on every sync attempt. */
export function isReadyForAttempt(item: QueuedMutation, now = Date.now()): boolean {
    if (isTerminalFailure(item)) return false;
    if (!item.lastAttemptAt) return true;
    return now - item.lastAttemptAt >= nextRetryDelayMs(item.retryCount);
}

function newDeviceId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `device-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

interface OfflineSyncState {
    isOnline: boolean;
    isSyncing: boolean;
    queue: QueuedMutation[];
    session: OfflineSession;
    /** Stable per-browser identity so queued items are attributable. */
    deviceId: string;
    lastSyncAt: number | null;

    setOnlineStatus: (status: boolean) => void;
    /** Records the signed-in user so their queue is bound to them. */
    setSession: (session: OfflineSession) => void;
    enqueueMutation: (actionName: string, payload: Record<string, unknown>, endpoint?: string) => string;
    removeMutation: (id: string) => void;
    clearQueue: () => void;
    syncPendingMutations: (executor?: (item: QueuedMutation) => Promise<boolean>) => Promise<void>;
}

export const useOfflineSyncStore = create<OfflineSyncState>()(
    persist(
        (set, get) => ({
            isOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
            isSyncing: false,
            queue: [],
            session: {},
            deviceId: newDeviceId(),
            lastSyncAt: null,

            setOnlineStatus: (status: boolean) => {
                set({ isOnline: status });
                if (status && get().queue.length > 0 && !get().isSyncing) {
                    void get().syncPendingMutations();
                }
            },

            setSession: (session) => set({ session }),

            enqueueMutation: (actionName, payload, endpoint) => {
                const id = `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                const { session, deviceId } = get();
                const newMutation: QueuedMutation = {
                    id,
                    actionName,
                    endpoint,
                    // Throws on oversized payloads instead of storing them.
                    payload: sanitizeQueuedPayload(payload),
                    timestamp: Date.now(),
                    retryCount: 0,
                    status: 'pending',
                    userId: session.userId,
                    deviceId: session.deviceId ?? deviceId,
                };
                set((state) => ({ queue: [...state.queue, newMutation] }));
                return id;
            },

            removeMutation: (id) => {
                set((state) => ({ queue: state.queue.filter((item) => item.id !== id) }));
            },

            clearQueue: () => {
                set({ queue: [] });
            },

            syncPendingMutations: async (executor) => {
                const { queue, isSyncing, isOnline, session, deviceId } = get();
                if (!isOnline || isSyncing || queue.length === 0) return;

                set({ isSyncing: true });

                const activeSession: OfflineSession = { userId: session.userId, deviceId: session.deviceId ?? deviceId };
                const remainingQueue: QueuedMutation[] = [];

                for (const item of queue) {
                    // A queue must never be replayed by a different session.
                    if (!belongsToSession(item, activeSession)) {
                        remainingQueue.push({
                            ...item,
                            status: 'failed',
                            lastError: 'Queued by a different user or device — sign in there to send it.',
                        });
                        continue;
                    }

                    // Exponential backoff, and terminal failures wait for a human.
                    if (!isReadyForAttempt(item)) {
                        remainingQueue.push(item);
                        continue;
                    }

                    let success = false;
                    let failureReason = '';

                    if (executor) {
                        try {
                            success = await executor(item);
                            if (!success) failureReason = 'Executor reported failure.';
                        } catch (err) {
                            failureReason = err instanceof Error ? err.message : 'Executor threw an error.';
                        }
                    } else if (item.endpoint) {
                        try {
                            const response = await fetch(item.endpoint, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(item.payload),
                            });
                            success = response.ok;
                            if (!response.ok) failureReason = `Endpoint responded ${response.status}.`;
                        } catch (err) {
                            failureReason = err instanceof Error ? err.message : 'Network request failed.';
                        }
                    } else {
                        // Previously this path reported success with nothing
                        // sent. It must never do that again: keep the data and
                        // state plainly that no transport was available.
                        failureReason = 'No sync executor or endpoint configured — nothing was sent.';
                    }

                    // Acknowledged work leaves the queue; everything else stays
                    // with an explicit, human-readable status.
                    if (success) continue;

                    remainingQueue.push({
                        ...item,
                        status: 'failed',
                        retryCount: item.retryCount + 1,
                        lastError: failureReason,
                        lastAttemptAt: Date.now(),
                    });
                }

                set({ queue: remainingQueue, isSyncing: false, lastSyncAt: Date.now() });
            },
        }),
        {
            name: 'ngo-offline-sync-queue',
            storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {},
            })),
            // The device identity is persisted so queued items stay
            // attributable across reloads; the signed-in user is not stored.
            partialize: (state) => ({ queue: state.queue, deviceId: state.deviceId }),
        },
    ),
);
