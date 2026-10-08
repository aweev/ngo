'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';
import { enqueueOutboxEvent } from '@/lib/reliability';
import { toCsv } from '@/lib/csv';
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
    'reporting_donations_monthly', 'reporting_expenses_monthly',
    'beneficiaries', 'households', 'services', 'referrals', 'grants', 'funds',
]);

/** Hard cap: snapshots stay export-sized, not warehouse-sized. */
const MAX_REPORT_ROWS = 5000;
const REPORT_PAGE_SIZE = 1000;

interface ReportRow {
    [key: string]: unknown;
}

interface FetchedReport {
    definition: ReportDefinition;
    rows: ReportRow[];
    queryHash: string;
}

/**
 * Single fetch path shared by runReport and exportReportCsv so a snapshot
 * and its CSV can never disagree. Applies the stored eq-filters and sorting;
 * unknown columns fall back to unordered rather than failing the report.
 */
async function fetchReportRows(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    organizationId: string,
    reportId: string,
): Promise<{ data: FetchedReport | null; error: string | null }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    const { data: report } = await client
        .from('report_definitions')
        .select('*')
        .eq('id', reportId)
        .eq('organization_id', organizationId)
        .maybeSingle();

    if (!report) return { data: null, error: 'Report not found.' };
    if (!REPORTABLE_TABLES.has(report.entity_type)) {
        return { data: null, error: 'This report targets an unknown entity type.' };
    }

    const filters = (report.filters ?? {}) as Record<string, unknown>;
    const rows: ReportRow[] = [];
    let page = 0;
    for (;;) {
        let query = client
            .from(report.entity_type)
            .select('*')
            .eq('organization_id', organizationId);
        for (const [field, value] of Object.entries(filters)) {
            if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue;
            if (!/^[a-z_][a-z0-9_]*$/i.test(field)) continue;
            query = query.eq(field, value);
        }
        if (report.sort_field && /^[a-z_][a-z0-9_]*$/i.test(report.sort_field as string)) {
            try {
                query = query.order(report.sort_field, { ascending: report.sort_direction !== 'desc' });
            } catch {
                // Unknown sort column: fall back to unordered.
            }
        }
        const { data: batch, error: fetchErr } = await query.range(
            page * REPORT_PAGE_SIZE,
            page * REPORT_PAGE_SIZE + REPORT_PAGE_SIZE - 1,
        );
        if (fetchErr) {
            console.error('[fetchReportRows] fetch', fetchErr.message);
            return { data: null, error: 'Unable to generate the report. Please try again.' };
        }
        rows.push(...((batch ?? []) as ReportRow[]));
        if (!batch || batch.length < REPORT_PAGE_SIZE || rows.length >= MAX_REPORT_ROWS) break;
        page += 1;
    }
    const capped = rows.slice(0, MAX_REPORT_ROWS);
    const queryHash = createHash('sha256')
        .update(JSON.stringify({
            entity: report.entity_type,
            filters,
            sort: [report.sort_field ?? null, report.sort_direction ?? null],
            day: new Date().toISOString().slice(0, 10),
        }))
        .digest('hex');

    return { data: { definition: report as ReportDefinition, rows: capped, queryHash }, error: null };
}

/**
 * Wave 3 read models: monthly money aggregates. Reports snapshot these
 * instead of broad operational rows — cheaper, stable, and safe to export.
 */
export async function getMonthlyMoneyAggregates(kind: 'donations' | 'expenses') {
    const auth = await authorizePermission(PERMISSIONS.reporting.read);
    if (!auth.ok) return { data: null, error: auth.error };
    const view = kind === 'donations' ? 'reporting_donations_monthly' : 'reporting_expenses_monthly';
    const { data, error } = await auth.context.supabase
        .from(view)
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('bucket_month', { ascending: true })
        .limit(60);
    if (error) return { data: null, error: 'Unable to load monthly aggregates. Please try again.' };
    return { data: data ?? [], error: null };
}

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
 * applies (defense in depth). The query hash proves what the snapshot
 * contains: same definition + same day = same hash.
 */
export async function runReport(id: string): Promise<{ data: ReportSnapshot | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.reporting.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: fetched, error: fetchErr } = await fetchReportRows(auth.context.supabase, auth.organizationId, id);
    if (!fetched) return { data: null, error: fetchErr };
    const { definition: report, rows, queryHash } = fetched;

    const { data: snapshot, error: snapErr } = await auth.context.supabase
        .from('report_snapshots')
        .insert({
            organization_id: auth.organizationId,
            report_id: report.id,
            name: `${report.name} Snapshot (${new Date().toISOString().slice(0, 10)})`,
            row_count: rows.length,
            data: rows,
            query_hash: queryHash,
            generated_by: auth.context.userId,
        })
        .select()
        .single();

    if (snapErr) {
        console.error('[runReport] snapshot', snapErr.message);
        return { data: null, error: 'Unable to save the report snapshot. Please try again.' };
    }

    // Wave 3: transactional outbox — report completion fans out (email the
    // requester, webhook subscribers) via the durable drain, not inline.
    await enqueueOutboxEvent(auth.context.supabase as never, {
        organizationId: auth.organizationId,
        eventType: 'reporting.snapshot_created',
        payload: { reportId: report.id, snapshotId: (snapshot as { id?: string })?.id ?? null },
        idempotencyKey: `reporting.snapshot_created:${report.id}:${(snapshot as { id?: string })?.id ?? Date.now()}`,
    });
    await recordAuditEvent(auth.context.supabase as never, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'reporting.snapshot_created',
        entityType: 'report_snapshots',
        entityId: (snapshot as { id?: string })?.id ?? null,
        newValues: { report_id: report.id, row_count: rows.length, query_hash: queryHash },
        correlationId: newCorrelationId(),
    });

    revalidatePath(`/admin/reporting/${id}`);
    return { data: snapshot, error: null };
}

/**
 * Exports a report as CSV from the SAME fetch path as snapshots, so the
 * download and the stored snapshot can never disagree. The fundraiser flow:
 * run (snapshot + hash) -> export (CSV from live data) -> attach to the
 * donor report with the hash as provenance.
 */
export async function exportReportCsv(id: string): Promise<{
    data: { csv: string; filename: string; row_count: number; query_hash: string } | null;
    error: string | null;
}> {
    const auth = await authorizePermission(PERMISSIONS.reporting.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: fetched, error: fetchErr } = await fetchReportRows(auth.context.supabase, auth.organizationId, id);
    if (!fetched) return { data: null, error: fetchErr };

    const slug = (fetched.definition.slug || 'report').replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
    const day = new Date().toISOString().slice(0, 10);

    await recordAuditEvent(auth.context.supabase as never, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'reporting.csv_exported',
        entityType: 'report_definitions',
        entityId: id,
        newValues: { row_count: fetched.rows.length, query_hash: fetched.queryHash },
        correlationId: newCorrelationId(),
    });

    return {
        data: {
            csv: toCsv(fetched.rows),
            filename: `${slug}-${day}.csv`,
            row_count: fetched.rows.length,
            query_hash: fetched.queryHash,
        },
        error: null,
    };
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
