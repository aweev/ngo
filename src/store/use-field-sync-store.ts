'use client';

import { create } from 'zustand';
import type { SyncItemResult } from '@/actions/field-sync';
import {
    addNotice,
    getMeta,
    listFieldOps,
    listNotices,
    markOpFailed,
    removeFieldOps,
    setMeta,
    type StoredFieldOp,
    type SyncNotice,
} from '@/lib/offline/field-db';
import { classifyResults, nextBatch, type PushTransport } from '@/lib/offline/sync-engine';

/**
 * Field sync status store (Phase 1.2).
 * The outbox itself lives in IndexedDB — this store holds status only, so a
 * reload never loses queued work and never double-counts it.
 */
interface FieldSyncState {
    pendingCount: number;
    terminalCount: number;
    isSyncing: boolean;
    lastSyncAt: string | null;
    lastError: string | null;
    notices: SyncNotice[];
    refresh: () => Promise<void>;
    syncNow: (push: PushTransport, deviceId?: string | null) => Promise<{ synced: number; failed: number }>;
}

function deviceId(): string {
    try {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem('ngo-field-device') : null;
        if (stored) return stored;
        const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `field-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem('ngo-field-device', id);
        return id;
    } catch {
        return 'field-unknown-device';
    }
}

export function getFieldDeviceId(): string {
    return deviceId();
}

export const useFieldSyncStore = create<FieldSyncState>()((set, get) => ({
    pendingCount: 0,
    terminalCount: 0,
    isSyncing: false,
    lastSyncAt: null,
    lastError: null,
    notices: [],

    refresh: async () => {
        try {
            const [ops, notices, lastSyncAt] = await Promise.all([
                listFieldOps(),
                listNotices(),
                getMeta('last_sync_at'),
            ]);
            set({
                pendingCount: ops.length,
                terminalCount: ops.filter((o: StoredFieldOp) => o.attempts >= 8).length,
                notices,
                lastSyncAt,
            });
        } catch {
            // Storage failures must never crash the field UI.
        }
    },

    syncNow: async (push, deviceOverride) => {
        if (get().isSyncing) return { synced: 0, failed: 0 };
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            set({ lastError: 'You are offline. Records stay on this device.' });
            return { synced: 0, failed: 0 };
        }
        set({ isSyncing: true, lastError: null });
        let synced = 0;
        let failed = 0;
        try {
            const ops = await listFieldOps();
            const batch = nextBatch(ops, 25);
            if (batch.length === 0) {
                const remaining = ops.length;
                if (remaining > 0) {
                    set({ lastError: `${remaining} record(s) need human review before retrying.` });
                    failed = remaining;
                }
            } else {
                const { data, error } = await push({
                    operations: batch.map((op) => ({
                        kind: op.kind,
                        offline_uuid: op.offline_uuid,
                        idempotency_key: op.idempotency_key,
                        base_updated_at: op.base_updated_at ?? null,
                        payload: op.payload,
                    })),
                    device_id: deviceOverride ?? deviceId(),
                });
                if (error || !data) {
                    set({ lastError: error ?? 'Sync failed. Records stay on this device.' });
                    failed = batch.length;
                    for (const op of batch) {
                        await markOpFailed(op.offline_uuid, error ?? 'Sync failed.');
                    }
                } else {
                    const outcome = classifyResults(data as SyncItemResult[]);
                    if (outcome.acknowledged.length > 0) {
                        await removeFieldOps(outcome.acknowledged);
                        synced = outcome.acknowledged.length;
                    }
                    for (const [uuid, message] of Object.entries(outcome.failed)) {
                        await markOpFailed(uuid, message);
                        failed += 1;
                    }
                    for (const notice of outcome.notices) {
                        await addNotice({
                            id: `notice-${notice.offline_uuid}-${Date.now()}`,
                            offline_uuid: notice.offline_uuid,
                            kind: 'duplicate',
                            message: notice.message,
                            created_at: Date.now(),
                        });
                    }
                    const now = new Date().toISOString();
                    await setMeta('last_sync_at', now);
                    set({ lastSyncAt: now });
                    if (failed > 0) set({ lastError: `${failed} record(s) were rejected — kept on this device.` });
                }
            }
        } catch (err) {
            set({ lastError: err instanceof Error ? err.message : 'Sync failed. Records stay on this device.' });
        }
        await get().refresh();
        set({ isSyncing: false });
        return { synced, failed };
    },
}));
