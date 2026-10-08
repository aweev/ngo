'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';

/**
 * Field-report verification queue (Phase 1.3).
 * WhatsApp/SMS intake lands quarantined; only impact.manage reviewers move
 * reports forward, and only promote_field_report() can mint a measurement.
 */

const STATES = ['quarantined', 'pending_review', 'verified', 'rejected', 'promoted'] as const;

export async function getFieldReports(state?: string, limit = 50) {
    const auth = await authorizePermission(PERMISSIONS.impact.read);
    if (!auth.ok) return { data: null, error: auth.error };
    let query = auth.context.supabase
        .from('field_reports')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('received_at', { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 200));
    if (state && (STATES as readonly string[]).includes(state)) query = query.eq('validation_state', state);
    const { data, error } = await query;
    if (error) return { data: null, error: 'Unable to load field reports.' };
    return { data: data ?? [], error: null };
}

const reviewSchema = z.object({
    state: z.enum(['pending_review', 'verified', 'rejected']),
    reason: z.string().trim().max(1000).optional().nullable(),
    metric_id: z.string().uuid().optional().nullable(),
});

/** Reviewer moves a report out of quarantine (or rejects it with a reason). */
export async function reviewFieldReport(id: string, input: unknown) {
    const auth = await authorizePermission(PERMISSIONS.impact.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid review decision.' };

    const { data, error } = await auth.context.supabase
        .from('field_reports')
        .update({
            validation_state: parsed.data.state,
            validation_reason: parsed.data.reason ?? null,
            metric_id: parsed.data.metric_id ?? undefined,
            reviewed_by: auth.context.userId,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .maybeSingle();
    if (error || !data) return { data: null, error: 'Field report not found.' };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'field_report.reviewed',
        entityType: 'field_reports',
        entityId: id,
        newValues: { state: parsed.data.state, reason: parsed.data.reason ?? null },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/impact', 'page');
    return { data, error: null };
}

/**
 * Promotes a reviewed report into an impact measurement via the idempotent
 * SQL function. Safe to retry: promoting twice returns the same measurement.
 */
export async function promoteFieldReport(id: string) {
    const auth = await authorizePermission(PERMISSIONS.impact.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const { data, error } = await auth.context.supabase.rpc('promote_field_report', { p_report_id: id });
    if (error) return { data: null, error: error.message };
    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'field_report.promoted',
        entityType: 'field_reports',
        entityId: id,
        newValues: { measurement_id: data ?? null },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/admin/impact', 'page');
    return { data: { measurement_id: data }, error: null };
}
