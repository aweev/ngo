'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ImpactMetric, ImpactMetricInsert, ImpactMetricUpdate } from '@/types/domain/impact';

/** Get all impact metrics for the active organization. */
export async function getImpactMetrics(): Promise<{ data: ImpactMetric[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.impact.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('impact_metrics')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load impact metrics. Please try again.' };
    return { data, error: null };
}

/** Create an impact metric. */
export async function createImpactMetric(input: Omit<ImpactMetricInsert, 'organization_id' | 'created_by'>): Promise<{ data: ImpactMetric | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.impact.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('impact_metrics')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[createImpactMetric]', error.message);
        return { data: null, error: 'Unable to create impact metric. Please check the provided data.' };
    }

    revalidatePath('/admin/impact');
    return { data, error: null };
}

/** Update an impact metric (organization-scoped, cannot change organization). */
export async function updateImpactMetric(id: string, input: ImpactMetricUpdate): Promise<{ data: ImpactMetric | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.impact.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of an impact metric.' };
    }

    const { data, error } = await auth.context.supabase
        .from('impact_metrics')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateImpactMetric]', error.message);
        return { data: null, error: 'Unable to update impact metric. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Impact metric not found.' };

    revalidatePath('/admin/impact');
    return { data, error: null };
}

/** Delete an impact metric (organization-scoped). */
export async function deleteImpactMetric(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.impact.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('impact_metrics')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteImpactMetric]', error.message);
        return { error: 'Unable to delete impact metric. Please try again.' };
    }
    if (!data) return { error: 'Impact metric not found.' };

    revalidatePath('/admin/impact');
    return { error: null };
}

import type { ImpactGoal } from '@/types/domain/impact';

/** Get all impact goals for the active organization. */
export async function getImpactGoals(): Promise<{ data: ImpactGoal[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.impact.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('impact_goals')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load impact goals. Please try again.' };
    return { data, error: null };
}
