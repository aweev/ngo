'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';
import {
    createBeneficiaryRecord,
    createHouseholdRecord,
    decryptBeneficiaryRow,
    findDuplicates,
} from '@/lib/field-records';
import { decryptPii } from '@/lib/field-crypto';

/**
 * Beneficiary and household actions (Phase 1).
 * Every read decrypts server-side for authorized callers only
 * (beneficiaries.read); every write goes through the shared field core
 * (consent + encryption + idempotency).
 */

export async function registerHousehold(input: unknown) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const result = await createHouseholdRecord(auth.context.supabase, {
        organizationId: auth.organizationId,
        userId: auth.context.userId,
    }, input, 'field_app');
    if (!result.error) revalidatePath('/[locale]/field', 'page');
    return result;
}

export async function registerBeneficiary(input: unknown) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const result = await createBeneficiaryRecord(auth.context.supabase, {
        organizationId: auth.organizationId,
        userId: auth.context.userId,
    }, input, 'field_app');
    if (!result.error) revalidatePath('/[locale]/field', 'page');
    return result;
}

const searchSchema = z.object({
    query: z.string().trim().max(200).default(''),
    household_id: z.string().uuid().optional().nullable(),
    limit: z.number().int().min(1).max(100).default(25),
    include_archived: z.boolean().default(false),
});

/**
 * Lists beneficiaries. Name search runs against the blind hash for exact
 * normalized matches; fuzzy browsing decrypts a bounded page server-side.
 */
export async function getBeneficiaries(input?: unknown) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.read);
    if (!auth.ok) return { data: null, error: auth.error };
    const parsed = searchSchema.safeParse(input ?? {});
    if (!parsed.success) return { data: null, error: 'Invalid search.' };
    const v = parsed.data;

    let query = auth.context.supabase
        .from('beneficiaries')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('updated_at', { ascending: false })
        .limit(v.limit);
    if (!v.include_archived) query = query.eq('is_archived', false);
    if (v.household_id) query = query.eq('household_id', v.household_id);

    const { data, error } = await query;
    if (error) return { data: null, error: 'Unable to load beneficiaries. Please try again.' };

    const needle = v.query.trim().toLowerCase();
    const out = [];
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        try {
            const b = await decryptBeneficiaryRow(row, auth.organizationId);
            if (needle && !b.full_name.toLowerCase().includes(needle)) continue;
            out.push(b);
        } catch {
            continue;
        }
    }
    return { data: out, error: null };
}

export async function getBeneficiary(id: string) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.read);
    if (!auth.ok) return { data: null, error: auth.error };
    const { data, error } = await auth.context.supabase
        .from('beneficiaries')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (error || !data) return { data: null, error: 'Beneficiary not found.' };
    try {
        return { data: await decryptBeneficiaryRow(data, auth.organizationId), error: null };
    } catch {
        return { data: null, error: 'Unable to decrypt this record.' };
    }
}

export async function checkDuplicates(input: { full_name: string; household_id?: string | null; sex?: string; age_band?: string }) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (!input?.full_name?.trim()) return { data: [], error: null };
    const dups = await findDuplicates(auth.context.supabase, auth.organizationId, input);
    return { data: dups, error: null };
}

const updateSchema = z.object({
    sex: z.enum(['female', 'male', 'other', 'unknown']).optional(),
    age_band: z.enum(['under_5', 'age_5_11', 'age_12_17', 'age_18_59', 'age_60_plus', 'unknown']).optional(),
    disability: z.enum(['none', 'seeing', 'hearing', 'mobility', 'cognition', 'self_care', 'communication', 'unknown']).optional(),
    location_text: z.string().trim().max(500).optional(),
    household_id: z.string().uuid().nullable().optional(),
    /** Optimistic-concurrency base: rejects blind overwrites from stale clients. */
    base_updated_at: z.string().datetime().optional(),
});

/** Updates non-PII fields. Name/phone corrections create a new version via re-registration flow. */
export async function updateBeneficiary(id: string, input: unknown) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid beneficiary data.' };
    const { base_updated_at, ...patch } = parsed.data;

    const { data: current } = await auth.context.supabase
        .from('beneficiaries')
        .select('id, updated_at, sex, age_band, disability, location_text, household_id')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!current) return { data: null, error: 'Beneficiary not found.' };
    if (base_updated_at && (current as { updated_at: string }).updated_at !== base_updated_at) {
        // Surfaced, never silently overwritten: the clash waits in the queue.
        await auth.context.supabase.from('sync_conflicts').insert({
            organization_id: auth.organizationId,
            entity_type: 'beneficiaries',
            entity_id: id,
            local_data: { ...patch, base_updated_at },
            server_data: {
                updated_at: (current as { updated_at: string }).updated_at,
                sex: (current as { sex: string }).sex,
                age_band: (current as { age_band: string }).age_band,
            },
            status: 'open',
        });
        return { data: null, error: 'CONFLICT: this record changed on the server. Your edit waits in the sync queue for review.' };
    }

    const { data, error } = await auth.context.supabase
        .from('beneficiaries')
        .update({ ...patch, schema_version: 1 })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .maybeSingle();
    if (error || !data) return { data: null, error: 'Unable to update the beneficiary.' };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'beneficiary.updated',
        entityType: 'beneficiaries',
        entityId: id,
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/field', 'page');
    return { data: await decryptBeneficiaryRow(data, auth.organizationId), error: null };
}

/** Soft-archives a beneficiary (safe deletion path; hard delete is a DSAR flow). */
export async function archiveBeneficiary(id: string) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const { data, error } = await auth.context.supabase
        .from('beneficiaries')
        .update({ is_archived: true, deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();
    if (error || !data) return { error: 'Beneficiary not found.' };
    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'beneficiary.archived',
        entityType: 'beneficiaries',
        entityId: id,
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/field', 'page');
    return { error: null };
}

/**
 * Merges a duplicate into the kept record: services and referrals move,
 * the duplicate is archived. Both ids are returned for the audit trail.
 */
export async function mergeBeneficiaries(keepId: string, dupeId: string) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (keepId === dupeId) return { data: null, error: 'Cannot merge a record into itself.' };

    const { data: rows } = await auth.context.supabase
        .from('beneficiaries')
        .select('id')
        .eq('organization_id', auth.organizationId)
        .in('id', [keepId, dupeId]);
    if (!rows || rows.length !== 2) return { data: null, error: 'Both records must exist in your organization.' };

    const correlationId = newCorrelationId();
    await auth.context.supabase.from('services').update({ beneficiary_id: keepId }).eq('beneficiary_id', dupeId).eq('organization_id', auth.organizationId);
    await auth.context.supabase.from('referrals').update({ beneficiary_id: keepId }).eq('beneficiary_id', dupeId).eq('organization_id', auth.organizationId);
    await auth.context.supabase
        .from('beneficiaries')
        .update({ is_archived: true, deleted_at: new Date().toISOString() })
        .eq('id', dupeId)
        .eq('organization_id', auth.organizationId);

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'beneficiary.merged',
        entityType: 'beneficiaries',
        entityId: keepId,
        newValues: { merged_duplicate_id: dupeId },
        correlationId,
    });
    revalidatePath('/[locale]/field', 'page');
    return { data: { kept: keepId, archived: dupeId }, error: null };
}

/** Household directory with decrypted head names (authorized readers only). */
export async function getHouseholds(limit = 25) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.read);
    if (!auth.ok) return { data: null, error: auth.error };
    const { data, error } = await auth.context.supabase
        .from('households')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('updated_at', { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 100));
    if (error) return { data: null, error: 'Unable to load households.' };
    const out = [];
    for (const row of (data ?? []) as Array<Record<string, unknown>>) {
        try {
            out.push({
                id: row.id,
                organization_id: row.organization_id,
                head_name: await decryptPii(row.head_name_encrypted as string, auth.organizationId),
                location_text: row.location_text,
                member_count: row.member_count,
                consent_id: row.consent_id,
                offline_uuid: row.offline_uuid,
                created_at: row.created_at,
                updated_at: row.updated_at,
            });
        } catch {
            continue;
        }
    }
    return { data: out, error: null };
}
