'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ReportDefinition, ReportDefinitionInsert, ReportDefinitionUpdate, ReportSnapshot } from '@/types/domain/reporting';

/**
 * Allowlist of tables that may be targeted by report definitions. The dynamic
 * table name comes from the stored definition (authoring requires
 * reporting.manage) and every query is still scoped to the active
 * organization. Extend as new entity tables are introduced.
 */
const REPORTABLE_TABLES = new Set([
    'donations', 'donors', 'workers', 'volunteers', 'partners',
    'projects', 'campaigns', 'org_events', 'expenses', 'impact_metrics',
]);

/** Get all report definitions for the active organization. */
export async function getReports(): Promise<{ data: ReportDefinition[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.reporting.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('report_definitions')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load reports. Please try again.' };
    return { data, error: null };
}

/** Get a single report definition (scoped to the active organization). */
export async function getReport(id: string): Promise<{ data: ReportDefinition | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.reporting.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('report_definitions')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Report not found.' };
    return { data, error: null };
}

/** Create a report definition. */
export async function createReport(input: Omit<ReportDefinitionInsert, 'organization_id'>): Promise<{ data: ReportDefinition | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.reporting.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    if (input.entity_type && !REPORTABLE_TABLES.has(input.entity_type)) {
        return { data: null, error: 'Unknown report entity type.' };
    }

    const { data, error } = await auth.context.supabase
        .from('report_definitions')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[createReport]', error.message);
        return { data: null, error: 'Unable to create report. Please check the provided data.' };
    }

    revalidatePath('/admin/reporting');
    return { data, error: null };
}

/** Update a report definition (organization-scoped, cannot change organization). */
export async function updateReport(id: string, input: ReportDefinitionUpdate): Promise<{ data: ReportDefinition | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.reporting.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a report.' };
    }
    if (input.entity_type && !REPORTABLE_TABLES.has(input.entity_type)) {
        return { data: null, error: 'Unknown report entity type.' };
    }

    const { data, error } = await auth.context.supabase
        .from('report_definitions')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateReport]', error.message);
        return { data: null, error: 'Unable to update report. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Report not found.' };

    revalidatePath('/admin/reporting');
    return { data, error: null };
}

/**
 * Runs a report and stores a snapshot. Tenant-scoped even though RLS also
 * applies (defense in depth).
 */
export async function runReport(id: string): Promise<{ data: ReportSnapshot | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.reporting.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: report } = await auth.context.supabase
        .from('report_definitions')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (!report) return { data: null, error: 'Report not found.' };

    if (!REPORTABLE_TABLES.has(report.entity_type)) {
        return { data: null, error: 'This report targets an unknown entity type.' };
    }

    const { data: rows, error: fetchErr } = await auth.context.supabase
        .from(report.entity_type)
        .select('*')
        .eq('organization_id', auth.organizationId)
        .limit(100);

    if (fetchErr) {
        console.error('[runReport] fetch', fetchErr.message);
        return { data: null, error: 'Unable to generate the report. Please try again.' };
    }

    const { data: snapshot, error: snapErr } = await auth.context.supabase
        .from('report_snapshots')
        .insert({
            organization_id: auth.organizationId,
            report_id: report.id,
            name: `${report.name} Snapshot (${new Date().toISOString().slice(0, 10)})`,
            row_count: rows?.length || 0,
            data: rows || [],
            generated_by: auth.context.userId,
        })
        .select()
        .single();

    if (snapErr) {
        console.error('[runReport] snapshot', snapErr.message);
        return { data: null, error: 'Unable to save the report snapshot. Please try again.' };
    }

    revalidatePath(`/admin/reporting/${id}`);
    return { data: snapshot, error: null };
}

/** Get snapshots for a report (organization-scoped). */
export async function getReportSnapshots(reportId: string): Promise<{ data: ReportSnapshot[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.reporting.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('report_snapshots')
        .select('*')
        .eq('report_id', reportId)
        .eq('organization_id', auth.organizationId)
        .order('generated_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load report snapshots. Please try again.' };
    return { data, error: null };
}
