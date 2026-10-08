/**
 * Shared field-record core (Phase 1).
 *
 * Plain server module (NOT 'use server'). Every beneficiary write — direct
 * action or offline sync batch — funnels through here so consent, PII
 * encryption, duplicate detection, and idempotency cannot drift apart.
 *
 * Data-minimization rules enforced here, not in the UI:
 *   1. No beneficiary row without a granted consent record.
 *   2. Names/phones are ciphertext before insert; only blind hashes are queryable.
 *   3. Replays of an offline_uuid/idempotency_key return the existing row.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { decryptPii, encryptPii, nameSearchHash } from '@/lib/field-crypto';
import { recordConsent } from '@/lib/consent-records';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';
import type { AgeBand, Beneficiary, Disability, DuplicateCandidate, Sex } from '@/types/domain/field';

export const POLICY_VERSION = 'field-consent-v1';

const householdSchema = z.object({
    head_name: z.string().trim().min(2).max(200),
    location_text: z.string().trim().max(500).default(''),
    member_count: z.number().int().min(1).max(50).default(1),
    offline_uuid: z.string().trim().min(1).max(80).optional().nullable(),
    device_id: z.string().trim().max(80).optional().nullable(),
});

const beneficiarySchema = z.object({
    full_name: z.string().trim().min(2).max(200),
    household_id: z.string().uuid().optional().nullable(),
    sex: z.enum(['female', 'male', 'other', 'unknown']).default('unknown'),
    age_band: z.enum(['under_5', 'age_5_11', 'age_12_17', 'age_18_59', 'age_60_plus', 'unknown']).default('unknown'),
    disability: z.enum(['none', 'seeing', 'hearing', 'mobility', 'cognition', 'self_care', 'communication', 'unknown']).default('unknown'),
    phone: z.string().trim().max(40).optional().nullable(),
    location_text: z.string().trim().max(500).default(''),
    offline_uuid: z.string().trim().min(1).max(80).optional().nullable(),
    device_id: z.string().trim().max(80).optional().nullable(),
});

const serviceSchema = z.object({
    beneficiary_id: z.string().uuid().optional().nullable(),
    // Same-batch offline linkage (resolved by the sync endpoint). Direct
    // callers must pass beneficiary_id.
    beneficiary_offline_uuid: z.string().trim().min(1).max(80).optional().nullable(),
    project_id: z.string().uuid().optional().nullable(),
    service_type: z.string().trim().min(2).max(120),
    quantity: z.number().positive().max(100000).default(1),
    delivered_at: z.string().date().optional().nullable(),
    note: z.string().trim().max(2000).optional().nullable(),
    offline_uuid: z.string().trim().min(1).max(80).optional().nullable(),
    idempotency_key: z.string().trim().min(1).max(120).optional().nullable(),
    device_id: z.string().trim().max(80).optional().nullable(),
});

const referralSchema = z.object({
    beneficiary_id: z.string().uuid().optional().nullable(),
    beneficiary_offline_uuid: z.string().trim().min(1).max(80).optional().nullable(),
    referred_to: z.string().trim().min(2).max(200),
    reason: z.string().trim().max(2000).optional().nullable(),
    follow_up_at: z.string().date().optional().nullable(),
    offline_uuid: z.string().trim().min(1).max(80).optional().nullable(),
    device_id: z.string().trim().max(80).optional().nullable(),
});

export interface FieldContext {
    organizationId: string;
    userId: string;
}

export interface FieldResult<T> {
    data: T | null;
    error: string | null;
    /** True when the row already existed (offline replay). */
    replayed?: boolean;
}

function rowError(prefix: string, message: string): FieldResult<never> {
    console.error(prefix, message);
    return { data: null, error: 'Unable to save the field record. Please try again.' };
}

async function decryptBeneficiaryRow(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    row: any,
    organizationId: string,
): Promise<Beneficiary> {
    const [full_name, phone] = await Promise.all([
        decryptPii(row.full_name_encrypted as string, organizationId),
        row.phone_encrypted ? decryptPii(row.phone_encrypted as string, organizationId) : Promise.resolve(null),
    ]);
    return {
        id: row.id,
        organization_id: row.organization_id,
        household_id: row.household_id ?? null,
        full_name,
        sex: row.sex as Sex,
        age_band: row.age_band as AgeBand,
        disability: row.disability as Disability,
        phone,
        location_text: row.location_text ?? '',
        consent_id: row.consent_id ?? null,
        is_archived: !!row.is_archived,
        offline_uuid: row.offline_uuid ?? null,
        updated_at: row.updated_at,
        created_at: row.created_at,
    };
}

/**
 * Duplicate candidates: same blind name hash, or same household with a
 * matching sex/age-band profile. Archived rows are excluded.
 */
export async function findDuplicates(
    supabase: SupabaseClient,
    organizationId: string,
    input: { full_name: string; household_id?: string | null; sex?: string; age_band?: string; exclude_id?: string },
): Promise<DuplicateCandidate[]> {
    const hash = await nameSearchHash(input.full_name, organizationId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
        .from('beneficiaries')
        .select('id, household_id, location_text, sex, age_band, full_name_encrypted')
        .eq('organization_id', organizationId)
        .eq('is_archived', false)
        .eq('search_hash', hash)
        .limit(5);
    if (input.exclude_id) query = query.neq('id', input.exclude_id);
    const { data, error } = await query;
    if (error || !data) return [];

    const out: DuplicateCandidate[] = [];
    for (const row of data as Array<Record<string, unknown>>) {
        let full_name = '';
        try {
            full_name = await decryptPii(row.full_name_encrypted as string, organizationId);
        } catch {
            continue;
        }
        out.push({
            id: row.id as string,
            full_name,
            household_id: (row.household_id as string | null) ?? null,
            location_text: (row.location_text as string) ?? '',
            sex: row.sex as Sex,
            age_band: row.age_band as AgeBand,
            match_reason: 'same_name',
        });
    }

    if (input.household_id && out.length === 0) {
        const { data: housemates } = await (supabase as SupabaseClient)
            .from('beneficiaries')
            .select('id, household_id, location_text, sex, age_band, full_name_encrypted')
            .eq('organization_id', organizationId)
            .eq('is_archived', false)
            .eq('household_id', input.household_id)
            .eq('sex', input.sex ?? 'unknown')
            .eq('age_band', input.age_band ?? 'unknown')
            .limit(5);
        for (const row of (housemates ?? []) as Array<Record<string, unknown>>) {
            if (input.exclude_id && row.id === input.exclude_id) continue;
            let full_name = '';
            try {
                full_name = await decryptPii(row.full_name_encrypted as string, organizationId);
            } catch {
                continue;
            }
            out.push({
                id: row.id as string,
                full_name,
                household_id: (row.household_id as string | null) ?? null,
                location_text: (row.location_text as string) ?? '',
                sex: row.sex as Sex,
                age_band: row.age_band as AgeBand,
                match_reason: 'same_household_profile',
            });
        }
    }
    return out;
}

async function grantFieldConsent(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    ctx: FieldContext,
    source: string,
): Promise<string | null> {
    return recordConsent(supabase as SupabaseClient, ctx.organizationId, {
        subjectType: 'beneficiary',
        consentType: 'field_registration',
        policyVersion: POLICY_VERSION,
        source,
    });
}

/** Idempotent household insert (replay returns the existing row). */
export async function createHouseholdRecord(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    ctx: FieldContext,
    input: unknown,
    source = 'field_app',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<FieldResult<any>> {
    const parsed = householdSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Household name and location are required.' };
    const v = parsed.data;

    if (v.offline_uuid) {
        const { data: existing } = await supabase
            .from('households')
            .select('*')
            .eq('organization_id', ctx.organizationId)
            .eq('offline_uuid', v.offline_uuid)
            .maybeSingle();
        if (existing) return { data: existing, error: null, replayed: true };
    }

    const consentId = await grantFieldConsent(supabase, ctx, source);
    if (!consentId) return { data: null, error: 'Consent could not be recorded. The household was not saved.' };

    let encrypted: string;
    let hash: string;
    try {
        [encrypted, hash] = await Promise.all([
            encryptPii(v.head_name, ctx.organizationId),
            nameSearchHash(v.head_name, ctx.organizationId),
        ]);
    } catch (err) {
        return { data: null, error: err instanceof Error ? err.message : 'Encryption is not configured.' };
    }

    const { data, error } = await supabase
        .from('households')
        .insert({
            organization_id: ctx.organizationId,
            head_name_encrypted: encrypted,
            head_search_hash: hash,
            location_text: v.location_text,
            member_count: v.member_count,
            consent_id: consentId,
            created_by: ctx.userId,
            device_id: v.device_id ?? null,
            offline_uuid: v.offline_uuid ?? null,
        })
        .select('*')
        .single();
    if (error) return rowError('[field-records] household insert', error.message);

    await recordAuditEvent(supabase as SupabaseClient, {
        organizationId: ctx.organizationId,
        actorId: ctx.userId,
        action: 'household.registered',
        entityType: 'households',
        entityId: data.id,
        newValues: { offline_uuid: v.offline_uuid ?? null, member_count: v.member_count },
        correlationId: newCorrelationId(),
    });
    return { data, error: null };
}

/** Idempotent beneficiary insert with consent + encryption + duplicate signal. */
export async function createBeneficiaryRecord(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    ctx: FieldContext,
    input: unknown,
    source = 'field_app',
): Promise<FieldResult<{ beneficiary: Beneficiary; duplicates: DuplicateCandidate[]; replayed?: boolean }>> {
    const parsed = beneficiarySchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'A name of at least 2 characters is required.' };
    const v = parsed.data;

    if (v.offline_uuid) {
        const { data: existing } = await supabase
            .from('beneficiaries')
            .select('*')
            .eq('organization_id', ctx.organizationId)
            .eq('offline_uuid', v.offline_uuid)
            .maybeSingle();
        if (existing) {
            return {
                data: { beneficiary: await decryptBeneficiaryRow(existing, ctx.organizationId), duplicates: [], replayed: true },
                error: null,
                replayed: true,
            };
        }
    }

    const duplicates = await findDuplicates(supabase as SupabaseClient, ctx.organizationId, {
        full_name: v.full_name,
        household_id: v.household_id,
        sex: v.sex,
        age_band: v.age_band,
    });

    const consentId = await grantFieldConsent(supabase, ctx, source);
    if (!consentId) return { data: null, error: 'Consent could not be recorded. The beneficiary was not saved.' };

    let encrypted: string;
    let hash: string;
    let phoneEncrypted: string | null = null;
    try {
        [encrypted, hash] = await Promise.all([
            encryptPii(v.full_name, ctx.organizationId),
            nameSearchHash(v.full_name, ctx.organizationId),
        ]);
        if (v.phone) phoneEncrypted = await encryptPii(v.phone, ctx.organizationId);
    } catch (err) {
        return { data: null, error: err instanceof Error ? err.message : 'Encryption is not configured.' };
    }

    const { data, error } = await supabase
        .from('beneficiaries')
        .insert({
            organization_id: ctx.organizationId,
            household_id: v.household_id ?? null,
            full_name_encrypted: encrypted,
            search_hash: hash,
            sex: v.sex,
            age_band: v.age_band,
            disability: v.disability,
            phone_encrypted: phoneEncrypted,
            location_text: v.location_text,
            consent_id: consentId,
            created_by: ctx.userId,
            device_id: v.device_id ?? null,
            offline_uuid: v.offline_uuid ?? null,
        })
        .select('*')
        .single();
    if (error) return rowError('[field-records] beneficiary insert', error.message);

    await recordAuditEvent(supabase as SupabaseClient, {
        organizationId: ctx.organizationId,
        actorId: ctx.userId,
        action: 'beneficiary.registered',
        entityType: 'beneficiaries',
        entityId: data.id,
        newValues: { offline_uuid: v.offline_uuid ?? null, duplicate_candidates: duplicates.length },
        correlationId: newCorrelationId(),
    });
    return {
        data: { beneficiary: await decryptBeneficiaryRow(data, ctx.organizationId), duplicates },
        error: null,
    };
}

/** Idempotent service log (same idempotency key never logs twice). */
export async function createServiceRecord(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    ctx: FieldContext,
    input: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<FieldResult<any>> {
    const parsed = serviceSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Service type and beneficiary are required.' };
    const v = parsed.data;
    if (!v.beneficiary_id) return { data: null, error: 'Service type and beneficiary are required.' };
    const key = v.idempotency_key ?? v.offline_uuid ?? null;
    if (!key) return { data: null, error: 'An offline idempotency key is required.' };

    const { data: existing } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', ctx.organizationId)
        .eq('idempotency_key', key)
        .maybeSingle();
    if (existing) return { data: existing, error: null, replayed: true };

    const { data: beneficiary } = await supabase
        .from('beneficiaries')
        .select('id')
        .eq('id', v.beneficiary_id)
        .eq('organization_id', ctx.organizationId)
        .eq('is_archived', false)
        .maybeSingle();
    if (!beneficiary) return { data: null, error: 'Beneficiary not found.' };

    const { data, error } = await supabase
        .from('services')
        .insert({
            organization_id: ctx.organizationId,
            beneficiary_id: v.beneficiary_id,
            project_id: v.project_id ?? null,
            service_type: v.service_type,
            quantity: v.quantity,
            delivered_at: v.delivered_at ?? new Date().toISOString().slice(0, 10),
            delivered_by: ctx.userId,
            device_id: v.device_id ?? null,
            note: v.note ?? null,
            offline_uuid: v.offline_uuid ?? null,
            idempotency_key: key,
        })
        .select('*')
        .single();
    if (error) return rowError('[field-records] service insert', error.message);

    await recordAuditEvent(supabase as SupabaseClient, {
        organizationId: ctx.organizationId,
        actorId: ctx.userId,
        action: 'service.logged',
        entityType: 'services',
        entityId: data.id,
        newValues: { service_type: v.service_type, quantity: v.quantity },
        correlationId: newCorrelationId(),
    });
    return { data, error: null };
}

/** Referral create (idempotent on offline_uuid). */
export async function createReferralRecord(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    ctx: FieldContext,
    input: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<FieldResult<any>> {
    const parsed = referralSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Referral destination is required.' };
    const v = parsed.data;
    if (!v.beneficiary_id) return { data: null, error: 'A beneficiary is required for a referral.' };

    if (v.offline_uuid) {
        const { data: existing } = await supabase
            .from('referrals')
            .select('*')
            .eq('organization_id', ctx.organizationId)
            .eq('offline_uuid', v.offline_uuid)
            .maybeSingle();
        if (existing) return { data: existing, error: null, replayed: true };
    }

    const { data, error } = await supabase
        .from('referrals')
        .insert({
            organization_id: ctx.organizationId,
            beneficiary_id: v.beneficiary_id,
            referred_to: v.referred_to,
            reason: v.reason ?? null,
            follow_up_at: v.follow_up_at ?? null,
            created_by: ctx.userId,
            device_id: v.device_id ?? null,
            offline_uuid: v.offline_uuid ?? null,
        })
        .select('*')
        .single();
    if (error) return rowError('[field-records] referral insert', error.message);

    await recordAuditEvent(supabase as SupabaseClient, {
        organizationId: ctx.organizationId,
        actorId: ctx.userId,
        action: 'referral.created',
        entityType: 'referrals',
        entityId: data.id,
        newValues: { referred_to: v.referred_to },
        correlationId: newCorrelationId(),
    });
    return { data, error: null };
}

export { decryptBeneficiaryRow };
