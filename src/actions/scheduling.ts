'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ScheduledJob, ScheduledJobInsert, ScheduledJobUpdate, JobExecution } from '@/types/domain/scheduling';

/** Get all scheduled jobs for the active organization. */
export async function getScheduledJobs(): Promise<{ data: ScheduledJob[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.scheduling.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('scheduled_jobs')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load scheduled jobs. Please try again.' };
    return { data, error: null };
}

/** Create a scheduled job. */
export async function createScheduledJob(input: Omit<ScheduledJobInsert, 'organization_id'>): Promise<{ data: ScheduledJob | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.scheduling.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('scheduled_jobs')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[createScheduledJob]', error.message);
        return { data: null, error: 'Unable to create scheduled job. Please check the provided data.' };
    }

    revalidatePath('/admin/scheduling');
    return { data, error: null };
}

/** Update a scheduled job (organization-scoped, cannot change organization). */
export async function updateScheduledJob(id: string, input: ScheduledJobUpdate): Promise<{ data: ScheduledJob | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.scheduling.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a scheduled job.' };
    }

    const { data, error } = await auth.context.supabase
        .from('scheduled_jobs')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateScheduledJob]', error.message);
        return { data: null, error: 'Unable to update scheduled job. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Scheduled job not found.' };

    revalidatePath('/admin/scheduling');
    return { data, error: null };
}

/** Enable or disable a scheduled job. */
export async function toggleScheduledJob(id: string, is_active: boolean): Promise<{ data: ScheduledJob | null; error: string | null }> {
    return updateScheduledJob(id, { is_active });
}

/** Delete a scheduled job (organization-scoped). */
export async function deleteScheduledJob(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.scheduling.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('scheduled_jobs')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteScheduledJob]', error.message);
        return { error: 'Unable to delete scheduled job. Please try again.' };
    }
    if (!data) return { error: 'Scheduled job not found.' };

    revalidatePath('/admin/scheduling');
    return { error: null };
}

/** Get execution history (organization-scoped, optionally per job). */
export async function getJobExecutions(jobId?: string): Promise<{ data: JobExecution[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.scheduling.read);
    if (!auth.ok) return { data: null, error: auth.error };

    let query = auth.context.supabase
        .from('job_executions')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (jobId) query = query.eq('job_id', jobId);

    const { data, error } = await query;
    if (error) return { data: null, error: 'Unable to load job executions. Please try again.' };
    return { data, error: null };
}
