'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission, authorizeOrganization } from '@/lib/auth/guards';
import { PERMISSIONS, type AppRole } from '@/lib/auth/permissions';

const REQUESTABLE_ROLES: readonly AppRole[] = ['manager', 'admin'];

export interface RoleRequest {
    id: string;
    organization_id: string;
    user_id: string;
    requested_role: AppRole;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    created_at: string;
}

export async function getMyRoleRequests(): Promise<{ data: RoleRequest[]; error: string | null }> {
    const auth = await authorizeOrganization();
    if (!auth.ok) return { data: [], error: auth.error };

    const { data, error } = await auth.supabase
        .from('role_requests')
        .select('id, organization_id, user_id, requested_role, reason, status, created_at')
        .eq('organization_id', auth.organizationId)
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: false });

    if (error) return { data: [], error: 'Unable to load role requests.' };
    return { data: (data ?? []) as RoleRequest[], error: null };
}

export async function requestOrganizationRole(
    requestedRole: AppRole,
    reason: string,
): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizeOrganization();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!REQUESTABLE_ROLES.includes(requestedRole)) return { success: false, error: 'That role cannot be requested.' };
    if (auth.role === requestedRole || (requestedRole === 'manager' && auth.role === 'admin')) {
        return { success: false, error: 'You already have equal or greater access.' };
    }

    const { error } = await auth.supabase.from('role_requests').insert({
        organization_id: auth.organizationId,
        user_id: auth.userId,
        requested_role: requestedRole,
        reason: reason.trim() || null,
    });

    if (error) {
        if (error.code === '23505') return { success: false, error: 'You already have a pending request for this role.' };
        return { success: false, error: 'Unable to submit the role request.' };
    }

    revalidatePath('/dashboard/settings');
    return { success: true, error: null };
}

export async function cancelRoleRequest(id: string): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizeOrganization();
    if (!auth.ok) return { success: false, error: auth.error };

    const { error } = await auth.supabase
        .from('role_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', auth.userId)
        .eq('organization_id', auth.organizationId)
        .eq('status', 'pending');

    if (error) return { success: false, error: 'Unable to cancel the role request.' };
    revalidatePath('/dashboard/settings');
    return { success: true, error: null };
}

export async function getPendingRoleRequests(): Promise<{ data: RoleRequest[]; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.members.manage);
    if (!auth.ok) return { data: [], error: auth.error };

    const { data, error } = await auth.supabase
        .from('role_requests')
        .select('id, organization_id, user_id, requested_role, reason, status, created_at')
        .eq('organization_id', auth.organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (error) return { data: [], error: 'Unable to load pending role requests.' };
    return { data: (data ?? []) as RoleRequest[], error: null };
}

export async function reviewRoleRequest(
    id: string,
    decision: 'approved' | 'rejected',
    reviewNote: string,
): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.members.manage);
    if (!auth.ok) return { success: false, error: auth.error };

    const { data: request, error: readError } = await auth.supabase
        .from('role_requests')
        .select('user_id, requested_role')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .eq('status', 'pending')
        .maybeSingle();
    if (readError || !request) return { success: false, error: 'Role request not found.' };

    const { error: updateError } = await auth.supabase.from('role_requests').update({
        status: decision,
        reviewed_by: auth.userId,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote.trim() || null,
        updated_at: new Date().toISOString(),
    }).eq('id', id).eq('organization_id', auth.organizationId).eq('status', 'pending');
    if (updateError) return { success: false, error: 'Unable to review the role request.' };

    if (decision === 'approved') {
        const { error: membershipError } = await auth.supabase
            .from('organization_members')
            .update({ role: request.requested_role, updated_at: new Date().toISOString() })
            .eq('organization_id', auth.organizationId)
            .eq('user_id', request.user_id);
        if (membershipError) return { success: false, error: 'Request reviewed, but access could not be updated.' };
    }

    revalidatePath('/admin/settings');
    revalidatePath('/dashboard/settings');
    return { success: true, error: null };
}