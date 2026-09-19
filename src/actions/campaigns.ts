'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Campaign, CampaignInsert, CampaignUpdate } from '@/types/domain/projects';

const TABLE = 'campaigns';

/** Get all campaigns for the active organization. */
export async function getCampaigns(): Promise<{ data: Campaign[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.campaigns.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*, project:projects(name)')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load campaigns. Please try again.' };
    return { data, error: null };
}

/** Get a single campaign by ID (scoped to the active organization). */
export async function getCampaign(id: string): Promise<{ data: Campaign | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.campaigns.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Campaign not found.' };
    return { data, error: null };
}

/** Create a new campaign. */
export async function createCampaign(input: Omit<CampaignInsert, 'organization_id'>): Promise<{ data: Campaign | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.campaigns.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .insert({ ...input, organization_id: auth.organizationId })
        .select()
        .single();

    if (error) {
        console.error('[createCampaign]', error.message);
        return { data: null, error: 'Unable to create campaign. Please check the provided data.' };
    }

    revalidatePath('/admin/campaigns');
    return { data, error: null };
}

/** Update an existing campaign (organization-scoped, cannot change organization). */
export async function updateCampaign(id: string, input: CampaignUpdate): Promise<{ data: Campaign | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.campaigns.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a campaign.' };
    }

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateCampaign]', error.message);
        return { data: null, error: 'Unable to update campaign. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Campaign not found.' };

    revalidatePath('/admin/campaigns');
    revalidatePath(`/admin/campaigns/${id}`);
    return { data, error: null };
}

/** Delete a campaign (organization-scoped). */
export async function deleteCampaign(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.campaigns.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteCampaign]', error.message);
        return { error: 'Unable to delete campaign. Please try again.' };
    }
    if (!data) return { error: 'Campaign not found.' };

    revalidatePath('/admin/campaigns');
    return { error: null };
}

export async function getCampaignsStats(): Promise<{
    total: number;
    active: number;
    totalGoal: number;
    totalRaised: number;
    error: string | null;
}> {
    const auth = await authorizePermission(PERMISSIONS.campaigns.read);
    if (!auth.ok) return { total: 0, active: 0, totalGoal: 0, totalRaised: 0, error: auth.error };

    const { data, error } = await auth.context.supabase.from(TABLE).select('status, goal_amount, raised_amount');
    if (error) return { total: 0, active: 0, totalGoal: 0, totalRaised: 0, error: 'Unable to load campaign statistics.' };

    return {
        total: data.length,
        active: data.filter(c => c.status === 'active').length,
        totalGoal: data.reduce((sum, c) => sum + c.goal_amount, 0),
        totalRaised: data.reduce((sum, c) => sum + c.raised_amount, 0),
        error: null,
    };
}
