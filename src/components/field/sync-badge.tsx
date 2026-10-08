'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';
import { useFieldSyncStore } from '@/store/use-field-sync-store';

/** Header pill: pending count at a glance, taps through to the sync screen. */
export function FieldSyncBadge() {
    const t = useTranslations('Field');
    const { pendingCount, isSyncing, refresh } = useFieldSyncStore();

    useEffect(() => {
        // Deferred one frame: sync setState inside the effect body is disallowed.
        const raf = requestAnimationFrame(() => {
            void refresh();
        });
        return () => cancelAnimationFrame(raf);
    }, [refresh]);

    return (
        <Link
            href="/field/sync"
            className="flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold"
            aria-live="polite"
        >
            <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${pendingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                aria-hidden="true"
            />
            {isSyncing ? t('syncing') : pendingCount > 0 ? `${pendingCount}` : t('sync')}
        </Link>
    );
}
