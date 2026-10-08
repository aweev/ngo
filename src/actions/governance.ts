'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type {
    FeatureFlag,
    GovernanceApproval,
    HRLifecycleRecord,
    PerformanceReview,
} from '@/types/domain/governance';

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------

/** Get all feature flags for the active organization. */
export async function getFeatureFlags(): Promise<{ data: FeatureFlag[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.governance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('feature_flags')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('feature_key', { ascending: true });

    if (error) return { data: null, error: 'Unable to load feature flags. Please try again.' };
    return { data, error: null };
}

/** Update a feature flag (organization-scoped). */
export async function updateFeatureFlag(
    id: string,
    input: { is_enabled?: boolean; config?: Record<string, unknown> },
): Promise<{ data: FeatureFlag | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.governance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('feature_flags')
        .update({ ...input, updated_by: auth.context.userId })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateFeatureFlag]', error.message);
        return { data: null, error: 'Unable to update feature flag. Please try again.' };
    }
    if (!data) return { data: null, error: 'Feature flag not found.' };

    revalidatePath('/admin/governance');
    return { data, error: null };
}

// ---------------------------------------------------------------------------
// Governance approvals
// ---------------------------------------------------------------------------

/** Get approval requests for the active organization (optionally filtered). */
export async function getApprovals(status?: string): Promise<{ data: GovernanceApproval[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.governance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    let query = auth.context.supabase
        .from('governance_approvals')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false })
        .limit(100);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return { data: null, error: 'Unable to load approvals. Please try again.' };
    return { data: data as GovernanceApproval[], error: null };
}

/** Create an approval request (the current user is the requester). */
export async function createApproval(input: {
    entity_type: GovernanceApproval['entity_type'];
    entity_id: string;
    notes?: string;
}): Promise<{ data: GovernanceApproval | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.governance.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (!input.entity_id) return { data: null, error: 'Entity is required.' };

    const { data, error } = await auth.context.supabase
        .from('governance_approvals')
        .insert({
            organization_id: auth.organizationId,
            entity_type: input.entity_type,
            entity_id: input.entity_id,
            requested_by: auth.userId,
            status: 'pending',
            review_notes: input.notes ?? null,
        })
        .select()
        .single();

    if (error) {
        console.error('[createApproval]', error.message);
        return { data: null, error: 'Unable to create approval request. Please try again.' };
    }

    revalidatePath('/admin/governance');
    return { data: data as GovernanceApproval, error: null };
}

/**
 * Review an approval request. Prevents the requester from approving their own
 * request, and only allows transitions from 'pending'.
 */
export async function reviewApproval(
    id: string,
    decision: 'approved' | 'rejected' | 'changes_requested',
    notes?: string,
): Promise<{ data: GovernanceApproval | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.governance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: existing } = await auth.context.supabase
        .from('governance_approvals')
        .select('requested_by, status')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (!existing) return { data: null, error: 'Approval request not found.' };
    if (existing.status !== 'pending') {
        return { data: null, error: 'This request has already been decided.' };
    }
    if (existing.requested_by === auth.userId) {
        return { data: null, error: 'You cannot review your own approval request.' };
    }

    const { data, error } = await auth.context.supabase
        .from('governance_approvals')
        .update({
            status: decision,
            reviewer_id: auth.userId,
            review_notes: notes ?? null,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[reviewApproval]', error.message);
        return { data: null, error: 'Unable to update approval request. Please try again.' };
    }

    revalidatePath('/admin/governance');
    return { data: data as GovernanceApproval, error: null };
}

// ---------------------------------------------------------------------------
// HR lifecycle & performance reviews
// ---------------------------------------------------------------------------

export async function getPerformanceReviews(): Promise<{ data: PerformanceReview[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.governance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('performance_reviews')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load performance reviews. Please try again.' };
    return { data: data as PerformanceReview[], error: null };
}

/** Create a performance review (ED / people-lead flow). */
export async function createPerformanceReview(input: {
    subject_type: PerformanceReview['subject_type'];
    subject_id: string;
    title: string;
    rating: number;
    review_period?: string | null;
    strengths?: string[];
    areas_for_growth?: string[];
    feedback_notes?: string;
    is_private?: boolean;
}): Promise<{ data: PerformanceReview | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.governance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const rating = Math.round(Number(input.rating));
    if (!['worker', 'volunteer', 'partner'].includes(input.subject_type)) {
        return { data: null, error: 'Invalid review subject.' };
    }
    if (!input.subject_id || !input.title?.trim()) {
        return { data: null, error: 'Subject and title are required.' };
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        return { data: null, error: 'Rating must be between 1 and 5.' };
    }
    const clean = (v: unknown): string[] =>
        Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim()) : [];

    const { data, error } = await auth.context.supabase
        .from('performance_reviews')
        .insert({
            organization_id: auth.organizationId,
            reviewer_id: auth.userId,
            subject_type: input.subject_type,
            subject_id: input.subject_id,
            title: input.title.trim(),
            rating,
            review_period: input.review_period?.trim() || null,
            strengths: clean(input.strengths),
            areas_for_growth: clean(input.areas_for_growth),
            feedback_notes: input.feedback_notes?.trim() || '',
            is_private: input.is_private ?? true,
        })
        .select()
        .single();

    if (error) {
        console.error('[createPerformanceReview]', error.message);
        return { data: null, error: 'Unable to create the review. Please check the provided data.' };
    }

    revalidatePath('/admin/reviews');
    return { data: data as PerformanceReview, error: null };
}

export async function getHRLifecycleRecords(): Promise<{ data: HRLifecycleRecord[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.governance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('hr_lifecycle_records')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('effective_date', { ascending: false });

    if (error) return { data: null, error: 'Unable to load HR lifecycle records. Please try again.' };
    return { data: data as HRLifecycleRecord[], error: null };
}

export async function initiateOffboarding(input: {
    person_id: string;
    person_type: 'worker' | 'volunteer';
    reason: string;
    effective_date: string;
}): Promise<{ data: HRLifecycleRecord | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.governance.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (!input.reason.trim() || !input.effective_date) {
        return { data: null, error: 'A reason and effective date are required.' };
    }

    const { data, error } = await auth.context.supabase
        .from('hr_lifecycle_records')
        .insert({
            organization_id: auth.organizationId,
            person_id: input.person_id,
            person_type: input.person_type,
            type: 'offboarding',
            status: 'pending_approval',
            effective_date: input.effective_date,
            reason: input.reason.trim(),
            created_by: auth.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[initiateOffboarding]', error.message);
        return { data: null, error: 'Unable to initiate offboarding. Please check the provided data.' };
    }

    revalidatePath('/admin/hr');
    return { data: data as HRLifecycleRecord, error: null };
}
