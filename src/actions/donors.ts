'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Donor, DonorInsert, DonorUpdate } from '@/types/domain/donors';

const TABLE = 'donors';

/** Get all donors for the active organization. */
export async function getDonors(): Promise<{ data: Donor[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.donors.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load donors. Please try again.' };
    return { data, error: null };
}

/** Get a single donor by ID (scoped to the active organization). */
export async function getDonor(id: string): Promise<{ data: Donor | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.donors.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Donor not found.' };
    return { data, error: null };
}

/** Create a new donor. */
export async function createDonor(input: Omit<DonorInsert, 'organization_id'>): Promise<{ data: Donor | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.donors.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .insert({ ...input, organization_id: auth.organizationId })
        .select()
        .single();

    if (error) {
        console.error('[createDonor]', error.message);
        return { data: null, error: 'Unable to create donor. Please check the provided data.' };
    }

    revalidatePath('/admin/donors');
    return { data, error: null };
}

/** Update an existing donor (organization-scoped, cannot change organization). */
export async function updateDonor(id: string, input: DonorUpdate): Promise<{ data: Donor | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.donors.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a donor.' };
    }

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateDonor]', error.message);
        return { data: null, error: 'Unable to update donor. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Donor not found.' };

    revalidatePath('/admin/donors');
    revalidatePath(`/admin/donors/${id}`);
    return { data, error: null };
}

/** Delete a donor (organization-scoped). */
export async function deleteDonor(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.donors.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteDonor]', error.message);
        return { error: 'Unable to delete donor. Please try again.' };
    }
    if (!data) return { error: 'Donor not found.' };

    revalidatePath('/admin/donors');
    return { error: null };
}

export async function getDonorsStats(): Promise<{
    totalDonors: number;
    activeDonors: number;
    totalDonated: number;
    byType: Record<string, number>;
    error: string | null;
}> {
    const auth = await authorizePermission(PERMISSIONS.donors.read);
    if (!auth.ok) return { totalDonors: 0, activeDonors: 0, totalDonated: 0, byType: {}, error: auth.error };

    const { data, error } = await auth.context.supabase.from(TABLE).select('status, type, total_donated');
    if (error) return { totalDonors: 0, activeDonors: 0, totalDonated: 0, byType: {}, error: 'Unable to load donor statistics.' };

    return {
        totalDonors: data.length,
        activeDonors: data.filter(d => d.status === 'active').length,
        totalDonated: data.reduce((sum, d) => sum + (d.total_donated || 0), 0),
        byType: data.reduce((acc, d) => {
            acc[d.type] = (acc[d.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        error: null,
    };
}
