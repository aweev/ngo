'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Volunteer, VolunteerInsert, VolunteerUpdate, VolunteerHours, VolunteerHoursInsert } from '@/types/domain/volunteers';

const TABLE = 'volunteers';

/** Get all volunteers for the active organization. */
export async function getVolunteers(): Promise<{ data: Volunteer[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load volunteers. Please try again.' };
    return { data, error: null };
}

/** Get a single volunteer by ID (scoped to the active organization). */
export async function getVolunteer(id: string): Promise<{ data: Volunteer | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Volunteer not found.' };
    return { data, error: null };
}

/** Create a new volunteer. */
export async function createVolunteer(input: Omit<VolunteerInsert, 'organization_id'>): Promise<{ data: Volunteer | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .insert({ ...input, organization_id: auth.organizationId })
        .select()
        .single();

    if (error) {
        console.error('[createVolunteer]', error.message);
        return { data: null, error: 'Unable to create volunteer. Please check the provided data.' };
    }

    revalidatePath('/admin/volunteers');
    return { data, error: null };
}

/** Update an existing volunteer (organization-scoped, cannot change organization). */
export async function updateVolunteer(id: string, input: VolunteerUpdate): Promise<{ data: Volunteer | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a volunteer.' };
    }

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateVolunteer]', error.message);
        return { data: null, error: 'Unable to update volunteer. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Volunteer not found.' };

    revalidatePath('/admin/volunteers');
    revalidatePath(`/admin/volunteers/${id}`);
    return { data, error: null };
}

/** Delete a volunteer (organization-scoped). */
export async function deleteVolunteer(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteVolunteer]', error.message);
        return { error: 'Unable to delete volunteer. Please try again.' };
    }
    if (!data) return { error: 'Volunteer not found.' };

    revalidatePath('/admin/volunteers');
    return { error: null };
}

/** Log volunteer hours. */
export async function logVolunteerHours(input: VolunteerHoursInsert): Promise<{ data: VolunteerHours | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('volunteer_hours')
        .insert({ ...input, organization_id: auth.organizationId })
        .select()
        .single();

    if (error) {
        console.error('[logVolunteerHours]', error.message);
        return { data: null, error: 'Unable to log volunteer hours. Please check the provided data.' };
    }

    revalidatePath('/admin/volunteers');
    revalidatePath(`/admin/volunteers/${input.volunteer_id}`);
    return { data, error: null };
}

/** Approve logged volunteer hours (requires volunteers.approve_hours). */
export async function approveVolunteerHours(hoursId: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.approveHours);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('volunteer_hours')
        .update({
            status: 'approved',
            approved_by: auth.context.userId,
        })
        .eq('id', hoursId)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[approveVolunteerHours]', error.message);
        return { error: 'Unable to approve volunteer hours. Please try again.' };
    }
    if (!data) return { error: 'Volunteer hours not found.' };

    revalidatePath('/admin/volunteers');
    return { error: null };
}

export async function getVolunteersStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    totalHours: number;
    error: string | null;
}> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.read);
    if (!auth.ok) return { total: 0, active: 0, pending: 0, totalHours: 0, error: auth.error };

    const { data, error } = await auth.context.supabase.from(TABLE).select('status, hours_logged');
    if (error) return { total: 0, active: 0, pending: 0, totalHours: 0, error: 'Unable to load volunteer statistics.' };

    return {
        total: data.length,
        active: data.filter(v => v.status === 'active').length,
        pending: data.filter(v => v.status === 'pending').length,
        totalHours: data.reduce((sum, v) => sum + (v.hours_logged || 0), 0),
        error: null,
    };
}
