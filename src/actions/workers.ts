'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Worker, WorkerInsert, WorkerUpdate } from '@/types/domain/workers';

const TABLE = 'workers';

/** Get all workers for the active organization. */
export async function getWorkers(): Promise<{ data: Worker[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workers.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load workers. Please try again.' };
    return { data, error: null };
}

/** Get a single worker by ID (scoped to the active organization). */
export async function getWorker(id: string): Promise<{ data: Worker | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workers.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Worker not found.' };
    return { data, error: null };
}

/** Create a new worker. */
export async function createWorker(input: Omit<WorkerInsert, 'organization_id'>): Promise<{ data: Worker | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workers.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .insert({ ...input, organization_id: auth.organizationId })
        .select()
        .single();

    if (error) {
        console.error('[createWorker]', error.message);
        return { data: null, error: 'Unable to create worker. Please check the provided data.' };
    }

    revalidatePath('/admin/workers');
    return { data, error: null };
}

/** Update an existing worker (organization-scoped, cannot change organization). */
export async function updateWorker(id: string, input: WorkerUpdate): Promise<{ data: Worker | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workers.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a worker.' };
    }

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateWorker]', error.message);
        return { data: null, error: 'Unable to update worker. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Worker not found.' };

    revalidatePath('/admin/workers');
    revalidatePath(`/admin/workers/${id}`);
    return { data, error: null };
}

/** Delete a worker (organization-scoped). */
export async function deleteWorker(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workers.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteWorker]', error.message);
        return { error: 'Unable to delete worker. Please try again.' };
    }
    if (!data) return { error: 'Worker not found.' };

    revalidatePath('/admin/workers');
    return { error: null };
}

/** Get workers statistics. */
export async function getWorkersStats(): Promise<{
    total: number;
    active: number;
    onLeave: number;
    byDepartment: Record<string, number>;
    error: string | null;
}> {
    const auth = await authorizePermission(PERMISSIONS.workers.read);
    if (!auth.ok) return { total: 0, active: 0, onLeave: 0, byDepartment: {}, error: auth.error };

    const { data, error } = await auth.context.supabase.from(TABLE).select('status, department');
    if (error) return { total: 0, active: 0, onLeave: 0, byDepartment: {}, error: 'Unable to load worker statistics.' };

    return {
        total: data.length,
        active: data.filter(w => w.status === 'active').length,
        onLeave: data.filter(w => w.status === 'on_leave').length,
        byDepartment: data.reduce((acc, w) => {
            const dept = w.department || 'Unassigned';
            acc[dept] = (acc[dept] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        error: null,
    };
}
