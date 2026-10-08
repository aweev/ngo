'use client';

/**
 * Field offline store (Phase 1.2).
 *
 * IndexedDB-backed outbox + form drafts for the field app. Works for days
 * without a network: operations carry idempotency keys, drafts autosave per
 * form, and photos are NOT staged here (evidence uploads when online).
 *
 * Runs with an in-memory fallback when IndexedDB is unavailable (SSR,
 * private mode, unit tests) so callers never branch on storage support.
 */

export interface StoredFieldOp {
    offline_uuid: string;
    kind: 'household' | 'beneficiary' | 'service' | 'referral';
    idempotency_key: string;
    base_updated_at?: string | null;
    payload: Record<string, unknown>;
    device_id?: string | null;
    attempts: number;
    last_error?: string | null;
    created_at: number;
}

export interface SyncNotice {
    id: string;
    offline_uuid: string;
    kind: string;
    message: string;
    created_at: number;
}

const DB_NAME = 'ngo-field-v1';
const DB_VERSION = 1;

function idbAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
}

/** In-memory fallback (also what unit tests exercise). */
const memory = {
    outbox: new Map<string, StoredFieldOp>(),
    drafts: new Map<string, Record<string, unknown>>(),
    meta: new Map<string, string>(),
    notices: new Map<string, SyncNotice>(),
};

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('outbox')) {
                db.createObjectStore('outbox', { keyPath: 'offline_uuid' });
            }
            if (!db.objectStoreNames.contains('drafts')) {
                db.createObjectStore('drafts', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('meta')) {
                db.createObjectStore('meta', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('notices')) {
                db.createObjectStore('notices', { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed.'));
    });
}

function tx<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return openDb().then(
        (db) =>
            new Promise<T>((resolve, reject) => {
                const t = db.transaction(store, mode);
                const req = run(t.objectStore(store));
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error ?? new Error(`IndexedDB ${store} failed.`));
                t.oncomplete = () => db.close();
            }),
    );
}

function all<T>(store: string): Promise<T[]> {
    if (!idbAvailable()) {
        const m = store === 'outbox' ? memory.outbox : store === 'notices' ? memory.notices : null;
        if (!m) return Promise.resolve([]);
        return Promise.resolve([...m.values()] as T[]);
    }
    return tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>);
}

/** Largest single operation accepted (photos are never queued — see module doc). */
export const MAX_OP_BYTES = 256 * 1024;

export function newOfflineUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `field-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueFieldOp(op: Omit<StoredFieldOp, 'attempts' | 'created_at'>): Promise<void> {
    const size = JSON.stringify(op.payload ?? {}).length;
    if (size > MAX_OP_BYTES) throw new Error('This record is too large to queue offline.');
    const record: StoredFieldOp = { ...op, attempts: 0, last_error: null, created_at: Date.now() };
    if (!idbAvailable()) {
        memory.outbox.set(record.offline_uuid, record);
        return;
    }
    await tx('outbox', 'readwrite', (s) => s.put(record));
}

export async function listFieldOps(): Promise<StoredFieldOp[]> {
    const ops = await all<StoredFieldOp>('outbox');
    return ops.sort((a, b) => a.created_at - b.created_at);
}

export async function removeFieldOps(ids: string[]): Promise<void> {
    if (!idbAvailable()) {
        for (const id of ids) memory.outbox.delete(id);
        return;
    }
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const t = db.transaction('outbox', 'readwrite');
        const store = t.objectStore('outbox');
        for (const id of ids) store.delete(id);
        t.oncomplete = () => {
            db.close();
            resolve();
        };
        t.onerror = () => reject(t.error ?? new Error('IndexedDB delete failed.'));
    });
}

export async function markOpFailed(offlineUuid: string, message: string): Promise<void> {
    if (!idbAvailable()) {
        const op = memory.outbox.get(offlineUuid);
        if (op) memory.outbox.set(offlineUuid, { ...op, attempts: op.attempts + 1, last_error: message });
        return;
    }
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const t = db.transaction('outbox', 'readwrite');
        const store = t.objectStore('outbox');
        const get = store.get(offlineUuid);
        get.onsuccess = () => {
            const op = get.result as StoredFieldOp | undefined;
            if (op) store.put({ ...op, attempts: op.attempts + 1, last_error: message });
        };
        t.oncomplete = () => {
            db.close();
            resolve();
        };
        t.onerror = () => reject(t.error ?? new Error('IndexedDB update failed.'));
    });
}

export async function saveDraft(formKey: string, data: Record<string, unknown>): Promise<void> {
    if (!idbAvailable()) {
        memory.drafts.set(formKey, data);
        return;
    }
    await tx('drafts', 'readwrite', (s) => s.put({ key: formKey, data, saved_at: Date.now() }));
}

export async function loadDraft(formKey: string): Promise<Record<string, unknown> | null> {
    if (!idbAvailable()) return memory.drafts.get(formKey) ?? null;
    const row = await tx<{ data: Record<string, unknown> } | undefined>('drafts', 'readonly', (s) => s.get(formKey));
    return row?.data ?? null;
}

export async function clearDraft(formKey: string): Promise<void> {
    if (!idbAvailable()) {
        memory.drafts.delete(formKey);
        return;
    }
    await tx('drafts', 'readwrite', (s) => s.delete(formKey));
}

export async function getMeta(key: string): Promise<string | null> {
    if (!idbAvailable()) return memory.meta.get(key) ?? null;
    const row = await tx<{ value: string } | undefined>('meta', 'readonly', (s) => s.get(key));
    return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
    if (!idbAvailable()) {
        memory.meta.set(key, value);
        return;
    }
    await tx('meta', 'readwrite', (s) => s.put({ key, value }));
}

export async function addNotice(notice: SyncNotice): Promise<void> {
    if (!idbAvailable()) {
        memory.notices.set(notice.id, notice);
        return;
    }
    await tx('notices', 'readwrite', (s) => s.put(notice));
}

export async function listNotices(): Promise<SyncNotice[]> {
    const notices = await all<SyncNotice>('notices');
    return notices.sort((a, b) => b.created_at - a.created_at).slice(0, 20);
}

export async function clearNotices(): Promise<void> {
    if (!idbAvailable()) {
        memory.notices.clear();
        return;
    }
    await tx('notices', 'readwrite', (s) => s.clear());
}

/** Test-only reset for the in-memory fallback. */
export function __resetMemoryStore(): void {
    memory.outbox.clear();
    memory.drafts.clear();
    memory.meta.clear();
    memory.notices.clear();
}
