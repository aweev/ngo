'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { pullFieldUpdates, pushFieldBatch, resolveSyncConflict } from '@/actions/field-sync';
import { getFieldDeviceId, useFieldSyncStore } from '@/store/use-field-sync-store';
import type { StoredFieldOp } from '@/lib/offline/field-db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, RotateCcw, Trash2 } from 'lucide-react';

/**
 * Sync screen: pending count, one-tap push, duplicate notices, open
 * conflicts with keep-mine/keep-server resolution. Everything states
 * plainly what is on the device vs what was sent — including the two hard
 * edges: records exist ONLY on this device until they sync, and terminal
 * (8x-failed) records can be retried or explicitly discarded here.
 */
export function SyncPanel() {
    const t = useTranslations('Field');
    const {
        pendingCount, terminalCount, terminalOps, lockedCount, isSyncing,
        lastSyncAt, lastError, notices, refresh, syncNow, retryOp, discardOp,
    } = useFieldSyncStore();
    const [conflicts, setConflicts] = useState<Array<Record<string, unknown>>>([]);
    const [resolving, setResolving] = useState<string | null>(null);
    const [exported, setExported] = useState(false);
    const [discardArmed, setDiscardArmed] = useState<string | null>(null);
    const [discardTyped, setDiscardTyped] = useState('');

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

    /** Device-loss mitigation: the only copy of unsynced records is this
     * device, so the queue can always be exported and kept off-phone. */
    async function exportQueue() {
        const ops = await import('@/lib/offline/field-db').then((m) => m.listFieldOps());
        const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), operations: ops }, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `field-queue-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExported(true);
    }

    function opKindLabel(kind: StoredFieldOp['kind']): string {
        return t(`kind_${kind}`);
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

            <p className="rounded-2xl border border-amber-500/60 bg-amber-50 p-4 text-sm dark:bg-amber-950">
                {t('device_loss_warning')}
            </p>

            <div className="rounded-2xl border bg-card p-6 text-center">
                <div className="text-4xl font-bold">{pendingCount}</div>
                <p className="text-sm text-muted-foreground">{t('pending_label')}</p>
                <Button className="mt-4 min-h-12 w-full" disabled={isSyncing || pendingCount === 0} onClick={onSync}>
                    {isSyncing ? t('syncing') : t('sync_now')}
                </Button>
                {pendingCount > 0 && (
                    <Button
                        variant="outline"
                        className="mt-2 min-h-11 w-full"
                        disabled={isSyncing}
                        onClick={() => void exportQueue()}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        {t('export_queue')}
                    </Button>
                )}
                {exported && <p className="mt-2 text-sm text-emerald-600">{t('export_done')}</p>}
                {lastError && <p className="mt-2 text-sm text-destructive">{lastError}</p>}
                {pendingCount === 0 && !lastError && (
                    <p className="mt-2 text-sm text-emerald-600">{t('queue_empty')}</p>
                )}
                {lockedCount > 0 && (
                    <p className="mt-2 text-sm text-amber-600">{t('locked_records', { count: lockedCount })}</p>
                )}
                {terminalCount > 0 && (
                    <p className="mt-2 text-sm text-amber-600">
                        {t('review_queue')}: {terminalCount}
                    </p>
                )}
            </div>

            {terminalOps.length > 0 && (
                <div className="space-y-3 rounded-2xl border bg-card p-4">
                    <h2 className="font-bold">{t('review_queue')}</h2>
                    {terminalOps.map((op) => {
                        const armed = discardArmed === op.offline_uuid;
                        return (
                            <div key={op.offline_uuid} className="space-y-2 rounded-xl border p-3">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-semibold text-foreground">{opKindLabel(op.kind)}</span>
                                    <span>{new Date(op.created_at).toLocaleString()}</span>
                                    <span>{t('attempts')}: {op.attempts}</span>
                                </div>
                                <p className="break-all font-mono text-[11px] text-muted-foreground">
                                    {JSON.stringify(op.payload).slice(0, 200)}
                                </p>
                                {op.last_error && <p className="text-xs text-destructive">{op.last_error}</p>}
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        className="min-h-11"
                                        onClick={() => void retryOp(op.offline_uuid)}
                                    >
                                        <RotateCcw className="mr-2 h-4 w-4" />
                                        {t('retry_op')}
                                    </Button>
                                    {!armed && (
                                        <Button
                                            variant="outline"
                                            className="min-h-11"
                                            onClick={() => {
                                                setDiscardArmed(op.offline_uuid);
                                                setDiscardTyped('');
                                            }}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            {t('discard_op')}
                                        </Button>
                                    )}
                                </div>
                                {armed && (
                                    <div className="space-y-2 rounded-lg border border-destructive/50 p-3">
                                        <p className="text-xs">{t('discard_confirm')}</p>
                                        <Input
                                            value={discardTyped}
                                            onChange={(e) => setDiscardTyped(e.target.value)}
                                            placeholder="DELETE"
                                            aria-label={t('discard_confirm')}
                                            className="min-h-12 text-base"
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                variant="destructive"
                                                className="min-h-11"
                                                disabled={discardTyped !== 'DELETE'}
                                                onClick={() => {
                                                    setDiscardArmed(null);
                                                    setDiscardTyped('');
                                                    void discardOp(op.offline_uuid);
                                                }}
                                            >
                                                {t('discard_btn')}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                className="min-h-11"
                                                onClick={() => setDiscardArmed(null)}
                                            >
                                                {t('back')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

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
