'use client';

import React, { useEffect, useMemo } from 'react';
import { WifiOff, RefreshCw, CircleAlert, Send } from 'lucide-react';
import { useOfflineSyncStore } from '@/store/use-offline-sync-store';

/**
 * Honest offline status (audit Wave 2 / P1): never a green "all good" for work
 * that has not actually been acknowledged by the server.
 */
export function OfflineBanner() {
    const { isOnline, isSyncing, queue, setOnlineStatus, syncPendingMutations } = useOfflineSyncStore();

    const { pending, failed } = useMemo(() => ({
        pending: queue.filter((item) => item.status !== 'failed').length,
        failed: queue.filter((item) => item.status === 'failed').length,
    }), [queue]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOnline = () => setOnlineStatus(true);
        const handleOffline = () => setOnlineStatus(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        setOnlineStatus(navigator.onLine);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [setOnlineStatus]);

    if (isOnline && queue.length === 0 && !isSyncing) {
        return null;
    }

    return (
        <aside
            aria-label="Offline sync status"
            className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-stone-900/95 px-4 py-3 text-sm text-stone-100 shadow-xl backdrop-blur-md transition-all duration-300 dark:border-amber-400/20"
        >
            {!isOnline ? (
                <>
                    <div className="flex items-center gap-2 text-amber-400">
                        <WifiOff className="h-4 w-4 animate-pulse" />
                        <span className="font-medium">Saved on this device — not yet sent</span>
                    </div>
                    {queue.length > 0 && (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-300">
                            {pending} queued{failed > 0 ? ` · ${failed} need attention` : ''}
                        </span>
                    )}
                </>
            ) : isSyncing ? (
                <div className="flex items-center gap-2 text-sky-400">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Sending {pending} queued item(s)…</span>
                </div>
            ) : failed > 0 ? (
                <div className="flex items-center gap-2 text-amber-400">
                    <CircleAlert className="h-4 w-4" />
                    <span>{failed} item(s) not sent — needs attention</span>
                    <button
                        type="button"
                        onClick={() => void syncPendingMutations()}
                        className="ml-2 rounded bg-amber-600/30 px-2 py-1 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-600/50"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-sky-300">
                    <Send className="h-4 w-4" />
                    <span>{pending} item(s) waiting to be sent</span>
                    <button
                        type="button"
                        onClick={() => void syncPendingMutations()}
                        className="ml-2 rounded bg-sky-600/30 px-2 py-1 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-600/50"
                    >
                        Send now
                    </button>
                </div>
            )}
        </aside>
    );
}
