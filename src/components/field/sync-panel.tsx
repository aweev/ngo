'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { pullFieldUpdates, pushFieldBatch, resolveSyncConflict } from '@/actions/field-sync';
import { getFieldDeviceId, useFieldSyncStore } from '@/store/use-field-sync-store';
import { Button } from '@/components/ui/button';

/**
 * Sync screen: pending count, one-tap push, duplicate notices, open
 * conflicts with keep-mine/keep-server resolution. Everything states
 * plainly what is on the device vs what was sent.
 */
export function SyncPanel() {
    const t = useTranslations('Field');
    const { pendingCount, terminalCount, isSyncing, lastSyncAt, lastError, notices, refresh, syncNow } =
        useFieldSyncStore();
    const [conflicts, setConflicts] = useState<Array<Record<string, unknown>>>([]);
    const [resolving, setResolving] = useState<string | null>(null);

    const loadConflicts = useCallback(async () => {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
        try {
            const { data } = await pullFieldUpdates(null);
            setConflicts(((data?.open_conflicts ?? []) as Array<Record<string, unknown>>).slice(0, 20));
        } catch {
            // Offline: conflicts wait.
        }
    }, []);

    useEffect(() => {
        // Deferred one frame: sync setState inside the effect body is
        // disallowed (cascading renders); see admin-sidebar.tsx pattern.
        const raf = requestAnimationFrame(() => {
            void refresh();
            void loadConflicts();
        });
        return () => cancelAnimationFrame(raf);
    }, [refresh, loadConflicts]);

    async function onSync() {
        await syncNow(async (input) => pushFieldBatch(input), getFieldDeviceId());
        await loadConflicts();
    }

    async function resolve(id: string, resolution: 'local' | 'server') {
        setResolving(id);
        await resolveSyncConflict(id, { resolution });
        setResolving(null);
        await loadConflicts();
        await refresh();
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold">{t('sync_title')}</h1>
                <p className="text-sm text-muted-foreground">
                    {t('last_sync')}: {lastSyncAt ?? t('never_synced')}
                </p>
            </div>

            {typeof navigator !== 'undefined' && navigator.onLine === false && (
                <p className="rounded-2xl border border-amber-500 bg-amber-50 p-4 text-sm dark:bg-amber-950">
                    {t('offline_note')}
                </p>
            )}

            <div className="rounded-2xl border bg-card p-6 text-center">
                <div className="text-4xl font-bold">{pendingCount}</div>
                <p className="text-sm text-muted-foreground">{t('pending_label')}</p>
                <Button className="mt-4 min-h-12 w-full" disabled={isSyncing || pendingCount === 0} onClick={onSync}>
                    {isSyncing ? t('syncing') : t('sync_now')}
                </Button>
                {lastError && <p className="mt-2 text-sm text-destructive">{lastError}</p>}
                {pendingCount === 0 && !lastError && (
                    <p className="mt-2 text-sm text-emerald-600">{t('queue_empty')}</p>
                )}
                {terminalCount > 0 && (
                    <p className="mt-2 text-sm text-amber-600">
                        {t('review_queue')}: {terminalCount}
                    </p>
                )}
            </div>

            {notices.length > 0 && (
                <div className="space-y-2 rounded-2xl border bg-card p-4">
                    <h2 className="font-bold">{t('notices_title')}</h2>
                    {notices.map((n) => (
                        <p key={n.id} className="border-b py-2 text-sm last:border-0">
                            {n.message}
                        </p>
                    ))}
                </div>
            )}

            {conflicts.length > 0 && (
                <div className="space-y-2 rounded-2xl border bg-card p-4">
                    <h2 className="font-bold">{t('conflicts_title')}</h2>
                    {conflicts.map((c) => (
                        <div key={c.id as string} className="space-y-2 border-b py-2 last:border-0">
                            <p className="text-sm">
                                {c.entity_type as string} — {t('review_queue')}
                            </p>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="min-h-11 flex-1"
                                    disabled={resolving === c.id}
                                    onClick={() => void resolve(c.id as string, 'local')}
                                >
                                    {t('resolve_local')}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="min-h-11 flex-1"
                                    disabled={resolving === c.id}
                                    onClick={() => void resolve(c.id as string, 'server')}
                                >
                                    {t('resolve_server')}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
