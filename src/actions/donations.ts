'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Donation, DonationInsert, DonationUpdate } from '@/types/domain/donors';

const TABLE = 'donations';

/** Get all donations for the active organization. */
export async function getDonations(): Promise<{ data: Donation[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.donations.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load donations. Please try again.' };
    return { data, error: null };
}

/** Get a single donation by ID (scoped to the active organization). */
export async function getDonation(id: string): Promise<{ data: Donation | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.donations.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Donation not found.' };
    return { data, error: null };
}

/** Record a new donation. */
export async function createDonation(input: Omit<DonationInsert, 'organization_id'>): Promise<{ data: Donation | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.donations.create);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .insert({ ...input, organization_id: auth.organizationId })
        .select()
        .single();

    if (error) {
        console.error('[createDonation]', error.message);
        return { data: null, error: 'Unable to record donation. Please check the provided data.' };
    }

    revalidatePath('/admin/donations');
    return { data, error: null };
}

/** Update a donation (organization-scoped, cannot change organization). */
export async function updateDonation(id: string, input: DonationUpdate): Promise<{ data: Donation | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.donations.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a donation.' };
    }

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateDonation]', error.message);
        return { data: null, error: 'Unable to update donation. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Donation not found.' };

    revalidatePath('/admin/donations');
    revalidatePath(`/admin/donations/${id}`);
    return { data, error: null };
}

/** Delete a donation (organization-scoped). */
export async function deleteDonation(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.donations.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteDonation]', error.message);
        return { error: 'Unable to delete donation. Please try again.' };
    }
    if (!data) return { error: 'Donation not found.' };

    revalidatePath('/admin/donations');
    return { error: null };
}

export async function getDonationsStats(): Promise<{
    total: number;
    completed: number;
    pending: number;
    totalAmount: number;
    error: string | null;
}> {
    const auth = await authorizePermission(PERMISSIONS.donations.read);
    if (!auth.ok) return { total: 0, completed: 0, pending: 0, totalAmount: 0, error: auth.error };

    const { data, error } = await auth.context.supabase.from(TABLE).select('status, amount');
    if (error) return { total: 0, completed: 0, pending: 0, totalAmount: 0, error: 'Unable to load donation statistics.' };

    return {
        total: data.length,
        completed: data.filter(d => d.status === 'completed').length,
        pending: data.filter(d => d.status === 'pending').length,
        totalAmount: data
            .filter(d => d.status === 'completed')
            .reduce((sum, d) => sum + (d.amount || 0), 0),
        error: null,
    };
}
