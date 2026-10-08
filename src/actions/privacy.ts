'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';

/**
 * Privacy operating model (audit Wave 1):
 * consent evidence, retention schedules, legal holds, subject access and
 * erasure workflows, and a full tenant data export.
 */

export interface PrivacyActionResult<T> {
    data: T | null;
    error: string | null;
}

// Consent evidence writing lives in src/lib/consent-records.ts — a plain
// server module, deliberately NOT a 'use server' export (never callable
// from the browser: consent evidence comes only from trusted server flows).


// ---------------------------------------------------------------------------
// Admin: consent records
// ---------------------------------------------------------------------------

export async function getConsentRecords(limit = 100): Promise<PrivacyActionResult<unknown[]>> {
    const auth = await authorizePermission(PERMISSIONS.governance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('consent_records')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 500));
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
}

export async function withdrawConsent(consentId: string): Promise<PrivacyActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.governance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('consent_records')
        .update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() })
        .eq('id', consentId)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'consent.withdrawn',
        entityType: 'consent_records',
        entityId: consentId,
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

// ---------------------------------------------------------------------------
// Retention schedules + legal holds
// ---------------------------------------------------------------------------

export async function getRetentionPolicies(): Promise<PrivacyActionResult<unknown[]>> {
    const auth = await authorizePermission(PERMISSIONS.governance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('retention_schedules')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('entity_type');
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
}

const retentionSchema = z.object({
    entityType: z.string().trim().min(2).max(80),
    category: z.string().trim().min(2).max(80),
    retentionPeriodMonths: z.number().int().positive().max(1200),
    legalBasis: z.string().trim().max(300).optional().nullable(),
    disposition: z.enum(['delete', 'anonymize', 'review']).default('delete'),
});

export async function createRetentionPolicy(input: unknown): Promise<PrivacyActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.governance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const parsed = retentionSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid retention policy.' };

    const { data, error } = await auth.context.supabase
        .from('retention_schedules')
        .insert({
            organization_id: auth.organizationId,
            entity_type: parsed.data.entityType,
            category: parsed.data.category,
            retention_period_months: parsed.data.retentionPeriodMonths,
            legal_basis: parsed.data.legalBasis ?? null,
            disposition: parsed.data.disposition,
        })
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'retention_policy.created',
        entityType: 'retention_schedules',
        entityId: (data as { id: string }).id,
        newValues: parsed.data as Record<string, unknown>,
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

export async function getLegalHolds(): Promise<PrivacyActionResult<unknown[]>> {
    const auth = await authorizePermission(PERMISSIONS.governance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('legal_holds')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
}

const legalHoldSchema = z.object({
    name: z.string().trim().min(2).max(160),
    reason: z.string().trim().min(4).max(2000),
    entityTypes: z.array(z.string().trim().min(2).max(80)).max(20).default([]),
});

export async function createLegalHold(input: unknown): Promise<PrivacyActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.governance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const parsed = legalHoldSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid legal hold.' };

    const { data, error } = await auth.context.supabase
        .from('legal_holds')
        .insert({
            organization_id: auth.organizationId,
            name: parsed.data.name,
            reason: parsed.data.reason,
            entity_types: parsed.data.entityTypes,
            status: 'active',
            requested_by: auth.userId,
        })
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'legal_hold.created',
        entityType: 'legal_holds',
        entityId: (data as { id: string }).id,
        newValues: { name: parsed.data.name },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

export async function releaseLegalHold(holdId: string): Promise<PrivacyActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.governance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('legal_holds')
        .update({ status: 'released', released_by: auth.userId, released_at: new Date().toISOString() })
        .eq('id', holdId)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'legal_hold.released',
        entityType: 'legal_holds',
        entityId: holdId,
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

// ---------------------------------------------------------------------------
// Data subject requests (DSAR)
// ---------------------------------------------------------------------------

export async function getDataSubjectRequests(): Promise<PrivacyActionResult<unknown[]>> {
    const auth = await authorizePermission(PERMISSIONS.governance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('data_subject_requests')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('due_at', { ascending: true });
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
}

const dsarSchema = z.object({
    requestType: z.enum(['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection']),
    subjectName: z.string().trim().max(160).optional().nullable(),
    subjectEmail: z.string().trim().email().max(200),
    subjectIdentifiers: z.record(z.string(), z.unknown()).default({}),
});

export async function createDataSubjectRequest(input: unknown): Promise<PrivacyActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.governance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const parsed = dsarSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid subject request.' };

    const { data, error } = await auth.context.supabase
        .from('data_subject_requests')
        .insert({
            organization_id: auth.organizationId,
            request_type: parsed.data.requestType,
            subject_name: parsed.data.subjectName ?? null,
            subject_email: parsed.data.subjectEmail.toLowerCase(),
            subject_identifiers: parsed.data.subjectIdentifiers,
            status: 'received',
        })
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'dsar.received',
        entityType: 'data_subject_requests',
        entityId: (data as { id: string }).id,
        newValues: { request_type: parsed.data.requestType, subject_email: parsed.data.subjectEmail },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

const dsarUpdateSchema = z.object({
    status: z.enum(['received', 'verifying', 'in_progress', 'completed', 'rejected', 'withdrawn']),
    responseSummary: z.string().trim().max(4000).optional().nullable(),
});

export async function updateDataSubjectRequest(
    requestId: string,
    input: unknown,
): Promise<PrivacyActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.governance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const parsed = dsarUpdateSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid request update.' };

    const { data, error } = await auth.context.supabase
        .from('data_subject_requests')
        .update({
            status: parsed.data.status,
            response_summary: parsed.data.responseSummary ?? null,
            handled_by: auth.userId,
            completed_at: parsed.data.status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', requestId)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'dsar.status_changed',
        entityType: 'data_subject_requests',
        entityId: requestId,
        newValues: { status: parsed.data.status },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

// ---------------------------------------------------------------------------
// Tenant export (enterprise IT: data portability + audit evidence)
// ---------------------------------------------------------------------------

export interface TenantExportResult {
    exportedAt: string;
    organizationId: string;
    tables: Record<string, unknown[]>;
}

/** Export the caller's organization data as JSON (settings.manage only). */
export async function exportTenantData(): Promise<PrivacyActionResult<TenantExportResult>> {
    const auth = await authorizePermission(PERMISSIONS.settings.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const supabase = auth.context.supabase;
    const orgId = auth.organizationId;

    const [orgs, members, funds, grants, consents, dsar, holds, audit] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', orgId),
        supabase.from('organization_members').select('*').eq('organization_id', orgId),
        supabase.from('funds').select('*').eq('organization_id', orgId),
        supabase.from('grants').select('*').eq('organization_id', orgId),
        supabase.from('consent_records').select('*').eq('organization_id', orgId),
        supabase.from('data_subject_requests').select('*').eq('organization_id', orgId),
        supabase.from('legal_holds').select('*').eq('organization_id', orgId),
        supabase.from('audit_events').select('*').eq('organization_id', orgId).order('occurred_at', { ascending: false }).limit(10_000),
    ]);

    const tables: Record<string, unknown[]> = {
        organizations: orgs.data ?? [],
        organization_members: members.data ?? [],
        funds: funds.data ?? [],
        grants: grants.data ?? [],
        consent_records: consents.data ?? [],
        data_subject_requests: dsar.data ?? [],
        legal_holds: holds.data ?? [],
        audit_events: audit.data ?? [],
    };

    await recordAuditEvent(supabase, {
        organizationId: orgId,
        actorId: auth.userId,
        action: 'tenant.exported',
        entityType: 'organization',
        entityId: orgId,
        newValues: { includedTables: Object.keys(tables) },
        correlationId: newCorrelationId(),
    });

    return {
        data: {
            exportedAt: new Date().toISOString(),
            organizationId: orgId,
            tables,
        },
        error: null,
    };
}



