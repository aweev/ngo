'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Partner, PartnerInsert, PartnerUpdate } from '@/types/domain/partners';

const TABLE = 'partners';

/** Get all partners for the active organization. */
export async function getPartners(): Promise<{ data: Partner[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.partners.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load partners. Please try again.' };
    return { data, error: null };
}

/** Get a single partner by ID (scoped to the active organization). */
export async function getPartner(id: string): Promise<{ data: Partner | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.partners.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Partner not found.' };
    return { data, error: null };
}

/** Create a new partner. */
export async function createPartner(input: Omit<PartnerInsert, 'organization_id'>): Promise<{ data: Partner | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.partners.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .insert({ ...input, organization_id: auth.organizationId })
        .select()
        .single();

    if (error) {
        console.error('[createPartner]', error.message);
        return { data: null, error: 'Unable to create partner. Please check the provided data.' };
    }

    revalidatePath('/admin/partners');
    return { data, error: null };
}

/** Update an existing partner (organization-scoped, cannot change organization). */
export async function updatePartner(id: string, input: PartnerUpdate): Promise<{ data: Partner | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.partners.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a partner.' };
    }

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updatePartner]', error.message);
        return { data: null, error: 'Unable to update partner. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Partner not found.' };

    revalidatePath('/admin/partners');
    revalidatePath(`/admin/partners/${id}`);
    return { data, error: null };
}

/** Delete a partner (organization-scoped). */
export async function deletePartner(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.partners.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deletePartner]', error.message);
        return { error: 'Unable to delete partner. Please try again.' };
    }
    if (!data) return { error: 'Partner not found.' };

    revalidatePath('/admin/partners');
    return { error: null };
}

export async function getPartnersStats(): Promise<{
    total: number;
    active: number;
    byType: Record<string, number>;
    totalContractValue: number;
    error: string | null;
}> {
    const auth = await authorizePermission(PERMISSIONS.partners.read);
    if (!auth.ok) return { total: 0, active: 0, byType: {}, totalContractValue: 0, error: auth.error };

    const { data, error } = await auth.context.supabase.from(TABLE).select('status, type, contract_value');
    if (error) return { total: 0, active: 0, byType: {}, totalContractValue: 0, error: 'Unable to load partner statistics.' };

    return {
        total: data.length,
        active: data.filter(p => p.status === 'active').length,
        byType: data.reduce((acc, p) => {
            acc[p.type] = (acc[p.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        totalContractValue: data.reduce((sum, p) => sum + (p.contract_value || 0), 0),
        error: null,
    };
}
