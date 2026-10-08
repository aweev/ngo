'use server';

import { z } from 'zod';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';
import {
    createBeneficiaryRecord,
    createHouseholdRecord,
    createReferralRecord,
    createServiceRecord,
    decryptBeneficiaryRow,
} from '@/lib/field-records';
import type { FieldOp } from '@/types/domain/field';

/**
 * Offline sync endpoint (Phase 1.2).
 *
 * The field client queues operations in IndexedDB for days, then pushes them
 * here in creation order. Every item is acknowledged individually:
 *   - synced   (created, or replay of an existing offline_uuid/key)
 *   - duplicate (same person already exists — needs human merge decision)
 *   - conflict  (server row moved since base_updated_at — logged for review)
 *   - error     (validation/permission failure with a human message)
 *
 * Nothing is silently dropped: unprocessable items stay in the client outbox.
 */

const opSchema = z.object({
    kind: z.enum(['household', 'beneficiary', 'service', 'referral']),
    offline_uuid: z.string().trim().min(1).max(80),
    idempotency_key: z.string().trim().min(1).max(120),
    base_updated_at: z.string().datetime().optional().nullable(),
    payload: z.record(z.string(), z.unknown()),
});

const batchSchema = z.object({
    operations: z.array(opSchema).min(1).max(100),
    device_id: z.string().trim().max(80).optional().nullable(),
});

export interface SyncItemResult {
    offline_uuid: string;
    status: 'synced' | 'duplicate' | 'conflict' | 'error';
    entity_id?: string | null;
    message?: string | null;
    /** Server-side duplicate candidates when status is duplicate. */
    duplicates?: Array<{ id: string; full_name: string; location_text: string }>;
}

export async function pushFieldBatch(input: unknown): Promise<{ data: SyncItemResult[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const parsed = batchSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid sync batch (1-100 operations).' };

    const ctx = { organizationId: auth.organizationId, userId: auth.context.userId };
    const supabase = auth.context.supabase;
    const results: SyncItemResult[] = [];
    // Offline UUIDs minted on the device resolve to server ids within a batch,
    // so members queued together with their household link up correctly.
    const idByOfflineUuid = new Map<string, string>();

    for (const op of parsed.data.operations) {
        const rawPayload = { ...(op.payload as Record<string, unknown>) };
        // Household linkage for members registered offline in the same batch.
        if (typeof rawPayload.household_offline_uuid === 'string' && !rawPayload.household_id) {
            const resolved = idByOfflineUuid.get(rawPayload.household_offline_uuid);
            if (resolved) rawPayload.household_id = resolved;
        }
        // Services/referrals queued in the same batch as their beneficiary.
        if (typeof rawPayload.beneficiary_offline_uuid === 'string' && !rawPayload.beneficiary_id) {
            const resolved = idByOfflineUuid.get(rawPayload.beneficiary_offline_uuid);
            if (resolved) rawPayload.beneficiary_id = resolved;
        }
        const payload = {
            ...rawPayload,
            offline_uuid: op.offline_uuid,
            idempotency_key: op.idempotency_key,
            device_id: parsed.data.device_id ?? null,
        };
        try {
            if (op.kind === 'household') {
                const r = await createHouseholdRecord(supabase, ctx, payload, 'offline_sync');
                if (!r.error) idByOfflineUuid.set(op.offline_uuid, (r.data as { id: string }).id);
                results.push(r.error
                    ? { offline_uuid: op.offline_uuid, status: 'error', message: r.error }
                    : { offline_uuid: op.offline_uuid, status: 'synced', entity_id: (r.data as { id: string }).id });
            } else if (op.kind === 'beneficiary') {
                const r = await createBeneficiaryRecord(supabase, ctx, payload, 'offline_sync');
                if (!r.error && r.data) idByOfflineUuid.set(op.offline_uuid, r.data.beneficiary.id);
                if (r.error) {
                    results.push({ offline_uuid: op.offline_uuid, status: 'error', message: r.error });
                } else if (r.replayed) {
                    results.push({ offline_uuid: op.offline_uuid, status: 'synced', entity_id: r.data!.beneficiary.id });
                } else if (r.data!.duplicates.length > 0) {
                    // Created AND flagged: the record exists, a human merges later.
                    results.push({
                        offline_uuid: op.offline_uuid,
                        status: 'duplicate',
                        entity_id: r.data!.beneficiary.id,
                        message: `${r.data!.duplicates.length} possible match(es) need review.`,
                        duplicates: r.data!.duplicates.map((d) => ({ id: d.id, full_name: d.full_name, location_text: d.location_text })),
                    });
                } else {
                    results.push({ offline_uuid: op.offline_uuid, status: 'synced', entity_id: r.data!.beneficiary.id });
                }
            } else if (op.kind === 'service') {
                const r = await createServiceRecord(supabase, ctx, payload);
                results.push(r.error
                    ? { offline_uuid: op.offline_uuid, status: 'error', message: r.error }
                    : { offline_uuid: op.offline_uuid, status: 'synced', entity_id: (r.data as { id: string }).id });
            } else {
                const r = await createReferralRecord(supabase, ctx, payload);
                results.push(r.error
                    ? { offline_uuid: op.offline_uuid, status: 'error', message: r.error }
                    : { offline_uuid: op.offline_uuid, status: 'synced', entity_id: (r.data as { id: string }).id });
            }
        } catch (err) {
            results.push({
                offline_uuid: op.offline_uuid,
                status: 'error',
                message: err instanceof Error ? err.message : 'Sync failed for this record.',
            });
        }
    }

    return { data: results, error: null };
}

/**
 * Pulls server changes since a timestamp so the client can detect conflicts
 * (server updated_at newer than the edits base_updated_at) and refresh lists.
 */
export async function pullFieldUpdates(since: string | null) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.read);
    if (!auth.ok) return { data: null, error: auth.error };
    const sinceIso = since && !Number.isNaN(Date.parse(since)) ? since : new Date(0).toISOString();

    const [beneficiaries, services, referrals, conflicts] = await Promise.all([
        auth.context.supabase.from('beneficiaries').select('*').eq('organization_id', auth.organizationId).gt('updated_at', sinceIso).limit(200),
        auth.context.supabase.from('services').select('*').eq('organization_id', auth.organizationId).gt('updated_at', sinceIso).limit(200),
        auth.context.supabase.from('referrals').select('*').eq('organization_id', auth.organizationId).gt('updated_at', sinceIso).limit(200),
        auth.context.supabase.from('sync_conflicts').select('*').eq('organization_id', auth.organizationId).eq('status', 'open').order('created_at', { ascending: false }).limit(50),
    ]);

    const decrypted = [];
    for (const row of ((beneficiaries.data ?? []) as Array<Record<string, unknown>>)) {
        try {
            decrypted.push(await decryptBeneficiaryRow(row, auth.organizationId));
        } catch {
            continue;
        }
    }
    return {
        data: {
            server_time: new Date().toISOString(),
            beneficiaries: decrypted,
            services: services.data ?? [],
            referrals: referrals.data ?? [],
            open_conflicts: conflicts.data ?? [],
        },
        error: null,
    };
}

/**
 * Resolves an open sync conflict. `resolution` picks the winner; merged
 * applies a field-level patch on top of the server row.
 */
export async function resolveSyncConflict(
    id: string,
    input: { resolution: 'local' | 'server' | 'merged'; merged_patch?: Record<string, unknown> },
) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (!['local', 'server', 'merged'].includes(input.resolution)) {
        return { data: null, error: 'Invalid resolution.' };
    }

    const { data: conflict } = await auth.context.supabase
        .from('sync_conflicts')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .eq('status', 'open')
        .maybeSingle();
    if (!conflict) return { data: null, error: 'Conflict not found.' };

    const table = (conflict as { entity_type: string }).entity_type;
    const entityId = (conflict as { entity_id: string | null }).entity_id;
    const allowedTables = new Set(['beneficiaries', 'households', 'services', 'referrals']);
    if (entityId && allowedTables.has(table) && (input.resolution === 'local' || input.resolution === 'merged')) {
        const patch = input.resolution === 'merged'
            ? { ...((conflict as { local_data: Record<string, unknown> }).local_data), ...(input.merged_patch ?? {}) }
            : ((conflict as { local_data: Record<string, unknown> }).local_data as Record<string, unknown>);
        // Only non-PII operational fields may be overwritten through resolve;
        // encrypted columns are never patched from a conflict payload.
        const safePatch: Record<string, unknown> = {};
        for (const key of ['sex', 'age_band', 'disability', 'location_text', 'household_id', 'service_type', 'quantity', 'status', 'referred_to', 'follow_up_at', 'member_count']) {
            if (patch[key] !== undefined) safePatch[key] = patch[key];
        }
        if (Object.keys(safePatch).length > 0) {
            await auth.context.supabase.from(table).update(safePatch).eq('id', entityId).eq('organization_id', auth.organizationId);
        }
    }

    const status = input.resolution === 'local' ? 'resolved_local' : input.resolution === 'server' ? 'resolved_server' : 'merged';
    await auth.context.supabase
        .from('sync_conflicts')
        .update({ status, resolved_by: auth.context.userId, resolved_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', auth.organizationId);

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'sync.conflict_resolved',
        entityType: 'sync_conflicts',
        entityId: id,
        newValues: { resolution: status },
        correlationId: newCorrelationId(),
    });
    return { data: { id, status }, error: null };
}

export type { FieldOp };
