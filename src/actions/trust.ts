'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';

/**
 * Trust kernel actions (audit Wave 1): funds, grants, tenant domains,
 * legal entity, and the append-only audit event ledger + export.
 * Every mutation is org-scoped, permission-checked, and audit-logged.
 */

export interface TrustActionResult<T> {
    data: T | null;
    error: string | null;
}

const fundSchema = z.object({
    name: z.string().trim().min(2).max(160),
    code: z.string().trim().max(40).optional().nullable(),
    fund_type: z.enum(['unrestricted', 'temporarily_restricted', 'permanently_restricted']).default('unrestricted'),
    currency: z.string().trim().length(3).default('EUR'),
    purpose: z.string().trim().max(2000).optional().nullable(),
    donor_intent: z.string().trim().max(2000).optional().nullable(),
    start_date: z.string().date().optional().nullable(),
    end_date: z.string().date().optional().nullable(),
    is_active: z.boolean().default(true),
});

const grantSchema = z.object({
    fund_id: z.string().uuid().optional().nullable(),
    grantor_name: z.string().trim().min(2).max(200),
    grant_reference: z.string().trim().max(120).optional().nullable(),
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(4000).optional().nullable(),
    amount_committed: z.number().nonnegative(),
    currency: z.string().trim().length(3).default('EUR'),
    indirect_cost_rate: z.number().min(0).max(1).optional().nullable(),
    allowable_costs: z.record(z.string(), z.unknown()).default({}),
    status: z.enum(['draft', 'submitted', 'awarded', 'active', 'completed', 'closed', 'rejected']).default('draft'),
    start_date: z.string().date().optional().nullable(),
    end_date: z.string().date().optional().nullable(),
    reporting_requirements: z.record(z.string(), z.unknown()).default({}),
});

// ---------------------------------------------------------------------------
// Funds
// ---------------------------------------------------------------------------

export async function getFunds(): Promise<TrustActionResult<unknown[]>> {
    const auth = await authorizePermission(PERMISSIONS.finance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('funds')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
}

export async function createFund(input: unknown): Promise<TrustActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const parsed = fundSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid fund data.' };

    const { data, error } = await auth.context.supabase
        .from('funds')
        .insert({
            organization_id: auth.organizationId,
            created_by: auth.userId,
            ...parsed.data,
        })
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'fund.created',
        entityType: 'funds',
        entityId: (data as { id: string }).id,
        newValues: { name: parsed.data.name, fund_type: parsed.data.fund_type },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

export async function updateFund(id: string, input: unknown): Promise<TrustActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const parsed = fundSchema.partial().safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid fund data.' };

    const { data: before } = await auth.context.supabase
        .from('funds')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!before) return { data: null, error: 'Fund not found.' };

    const { data, error } = await auth.context.supabase
        .from('funds')
        .update(parsed.data)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'fund.updated',
        entityType: 'funds',
        entityId: id,
        oldValues: { fund_type: (before as { fund_type?: string }).fund_type },
        newValues: parsed.data as Record<string, unknown>,
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

// ---------------------------------------------------------------------------
// Grants
// ---------------------------------------------------------------------------

export async function getGrants(): Promise<TrustActionResult<unknown[]>> {
    const auth = await authorizePermission(PERMISSIONS.finance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('grants')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
}

export async function createGrant(input: unknown): Promise<TrustActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const parsed = grantSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid grant data.' };

    const { data, error } = await auth.context.supabase
        .from('grants')
        .insert({
            organization_id: auth.organizationId,
            created_by: auth.userId,
            ...parsed.data,
        })
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'grant.created',
        entityType: 'grants',
        entityId: (data as { id: string }).id,
        newValues: { title: parsed.data.title, amount_committed: parsed.data.amount_committed },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

export async function updateGrantStatus(id: string, status: string): Promise<TrustActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const allowed = ['draft', 'submitted', 'awarded', 'active', 'completed', 'closed', 'rejected'] as const;
    if (!allowed.includes(status as (typeof allowed)[number])) {
        return { data: null, error: 'Invalid grant status.' };
    }

    const { data: before } = await auth.context.supabase
        .from('grants')
        .select('status')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!before) return { data: null, error: 'Grant not found.' };

    const { data, error } = await auth.context.supabase
        .from('grants')
        .update({ status })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'grant.status_changed',
        entityType: 'grants',
        entityId: id,
        oldValues: before as Record<string, unknown>,
        newValues: { status },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

/**
 * Links a grant to a donor record (Phase 2.2 donor 360). Pass null to unlink.
 * The donor must belong to the same organization — no cross-tenant links.
 */
export async function linkGrantDonor(grantId: string, donorId: string | null): Promise<TrustActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    if (donorId) {
        const { data: donor } = await auth.context.supabase
            .from('donors')
            .select('id')
            .eq('id', donorId)
            .eq('organization_id', auth.organizationId)
            .maybeSingle();
        if (!donor) return { data: null, error: 'Donor not found.' };
    }

    const { data, error } = await auth.context.supabase
        .from('grants')
        .update({ donor_id: donorId })
        .eq('id', grantId)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .maybeSingle();
    if (error || !data) return { data: null, error: 'Grant not found.' };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'grant.donor_linked',
        entityType: 'grants',
        entityId: grantId,
        newValues: { donor_id: donorId },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

// ---------------------------------------------------------------------------
// Tenant domains + legal entity
// ---------------------------------------------------------------------------

export async function getOrgDomains(): Promise<TrustActionResult<unknown[]>> {
    const auth = await authorizePermission(PERMISSIONS.settings.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('org_domains')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('is_primary', { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
}

export async function upsertOrgDomain(input: {
    domain?: string;
    subdomain?: string;
    localeDefault?: string;
    isPrimary?: boolean;
}): Promise<TrustActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.settings.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const domain = input.domain?.trim().toLowerCase();
    const subdomain = input.subdomain?.trim().toLowerCase();
    if (!domain && !subdomain) return { data: null, error: 'A domain or subdomain is required.' };

    const { data, error } = await auth.context.supabase
        .from('org_domains')
        .upsert(
            {
                organization_id: auth.organizationId,
                domain: domain || null,
                subdomain: subdomain || null,
                locale_default: input.localeDefault ?? 'en',
                is_primary: input.isPrimary ?? false,
            },
            { onConflict: domain ? 'domain' : 'subdomain' },
        )
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'org_domain.upserted',
        entityType: 'org_domains',
        entityId: (data as { id: string }).id,
        newValues: { domain: domain ?? null, subdomain: subdomain ?? null },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

export async function getLegalEntity(): Promise<TrustActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.settings.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('legal_entity_data')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data: (data ?? null) as Record<string, unknown> | null, error: null };
}

export async function upsertLegalEntity(input: {
    legalName?: string;
    legalForm?: string;
    registrationNumber?: string;
    registrationJurisdiction?: string;
    taxId?: string;
    vatId?: string;
    registeredAddress?: string;
    country?: string;
    dataResidency?: string;
    website?: string;
}): Promise<TrustActionResult<Record<string, unknown>>> {
    const auth = await authorizePermission(PERMISSIONS.settings.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const values = {
        legal_name: input.legalName?.trim() || null,
        legal_form: input.legalForm?.trim() || null,
        registration_number: input.registrationNumber?.trim() || null,
        registration_jurisdiction: input.registrationJurisdiction?.trim() || null,
        tax_id: input.taxId?.trim() || null,
        vat_id: input.vatId?.trim() || null,
        registered_address: input.registeredAddress?.trim() || null,
        country: input.country?.trim() || null,
        data_residency: input.dataResidency?.trim() || null,
        website: input.website?.trim() || null,
    };

    const { data, error } = await auth.context.supabase
        .from('legal_entity_data')
        .upsert({ organization_id: auth.organizationId, ...values }, { onConflict: 'organization_id' })
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'legal_entity.upserted',
        entityType: 'legal_entity_data',
        entityId: (data as { id: string }).id,
        newValues: { legal_name: values.legal_name, country: values.country },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/trust', 'page');
    return { data: data as Record<string, unknown>, error: null };
}

// ---------------------------------------------------------------------------
// Append-only audit ledger (read + export)
// ---------------------------------------------------------------------------

export async function getAuditEvents(limit = 100): Promise<TrustActionResult<unknown[]>> {
    const auth = await authorizePermission(PERMISSIONS.audit.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('audit_events')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('occurred_at', { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 500));
    if (error) return { data: null, error: error.message };
    return { data: data ?? [], error: null };
}

/** CSV export of the audit ledger. Server builds the file; nothing client-side. */
function csvEscape(value: unknown): string {
    const s = value === null || value === undefined ? '' : String(value);
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

export async function exportAuditEventsCsv(): Promise<{ data: string | null; rowCount: number; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.audit.manage);
    if (!auth.ok) return { data: null, rowCount: 0, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('audit_events')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('occurred_at', { ascending: false })
        .limit(10_000);
    if (error) return { data: null, rowCount: 0, error: error.message };

    const rows = data ?? [];
    const header = 'occurred_at,actor_id,actor_role,action,entity_type,entity_id,correlation_id,reason';
    const body = rows
        .map((r) => {
            const e = r as Record<string, unknown>;
            return [
                e.occurred_at,
                e.actor_id,
                e.actor_role,
                e.action,
                e.entity_type,
                e.entity_id,
                e.correlation_id,
                e.reason,
            ]
                .map(csvEscape)
                .join(',');
        })
        .join('\n');

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'audit_events.exported',
        entityType: 'audit_events',
        newValues: { rowCount: rows.length, format: 'csv' },
        correlationId: newCorrelationId(),
    });

    return { data: `${header}\n${body}\n`, rowCount: rows.length, error: null };
}



