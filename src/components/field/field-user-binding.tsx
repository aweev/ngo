'use client';

import { useEffect } from 'react';
import { useFieldSyncStore } from '@/store/use-field-sync-store';

/**
 * Binds the field outbox to the signed-in officer (per-officer queue
 * binding). Mounted once by the field layout; enqueue sites read the id from
 * the sync store, and the sync push refuses ops stamped with a different
 * officer's id.
 */
export function FieldUserBinding({ userId }: { userId: string }) {
    useEffect(() => {
        useFieldSyncStore.getState().setCurrentUser(userId);
    }, [userId]);
    return null;
}
