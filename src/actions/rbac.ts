'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { CustomRole, CustomRoleInsert, CustomRoleUpdate } from '@/types/domain/rbac';

export async function getCustomRoles(): Promise<{ data: CustomRole[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.rbac.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('custom_roles')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });

    if (error) return { data: null, error: 'Unable to load roles. Please try again.' };
    return { data: data as CustomRole[], error: null };
}

/** Get a single custom role (scoped to the active organization). */
export async function getRole(id: string): Promise<{ data: CustomRole | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.rbac.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('custom_roles')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Role not found.' };
    return { data: data as CustomRole, error: null };
}

export async function createRole(
    input: Omit<CustomRoleInsert, 'organization_id' | 'is_system'>,
): Promise<{ data: CustomRole | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.rbac.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('custom_roles')
        .insert({ ...input, organization_id: auth.organizationId, is_system: false })
        .select()
        .single();

    if (error) {
        console.error('[createRole]', error.message);
        return { data: null, error: 'Unable to create role. Please check the provided data.' };
    }

    revalidatePath('/admin/rbac');
    return { data: data as CustomRole, error: null };
}

export async function updateRole(
    id: string,
    input: CustomRoleUpdate,
): Promise<{ data: CustomRole | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.rbac.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a role.' };
    }

    const { data, error } = await auth.context.supabase
        .from('custom_roles')
        .update({ ...input, organization_id: auth.organizationId })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .eq('is_system', false)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateRole]', error.message);
        return { data: null, error: 'Unable to update role. Please try again.' };
    }
    if (!data) return { data: null, error: 'Role not found or cannot be modified.' };

    revalidatePath('/admin/rbac');
    return { data: data as CustomRole, error: null };
}

export async function deleteRole(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.rbac.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('custom_roles')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .eq('is_system', false)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteRole]', error.message);
        return { error: 'Unable to delete role. Please try again.' };
    }
    if (!data) return { error: 'Role not found or cannot be deleted.' };

    revalidatePath('/admin/rbac');
    return { error: null };
}

// ===========================================================================
// Role assignments — grant/revoke a custom role to organization members.
//
// The read path (guards.ts `getCustomGrantRows`) already merges non-expired
// `role_assignments` rows into a user's effective permission set; these are
// the missing writers that make a created custom role actually take effect.
// ===========================================================================

export interface RoleAssignmentRow {
    userId: string;
    expiresAt: string | null;
    createdAt: string;
}

/** Members currently assigned this custom role (active organization only). */
export async function getRoleAssignments(
    roleId: string,
): Promise<{ data: RoleAssignmentRow[]; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.rbac.read);
    if (!auth.ok) return { data: [], error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('role_assignments')
        .select('user_id, expires_at, created_at')
        .eq('organization_id', auth.organizationId)
        .eq('role_id', roleId)
        .order('created_at', { ascending: true });

    if (error) return { data: [], error: 'Unable to load role assignments.' };
    return {
        data: (data ?? []).map((row) => ({
            userId: row.user_id as string,
            expiresAt: (row.expires_at as string | null) ?? null,
            createdAt: (row.created_at as string | null) ?? '',
        })),
        error: null,
    };
}

const assignSchema = z.object({
    roleId: z.string().uuid(),
    userId: z.string().uuid(),
    expiresAt: z.string().nullable().optional(),
});

const unassignSchema = z.object({
    roleId: z.string().uuid(),
    userId: z.string().uuid(),
});

/**
 * Grants a custom role to a member. Idempotent: re-assigning refreshes the
 * expiry rather than erroring on the (org, user, role) unique constraint.
 */
export async function assignRole(
    input: unknown,
): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.rbac.manage);
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = assignSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Invalid role assignment.' };
    const { roleId, userId, expiresAt } = parsed.data;

    // The role must belong to the caller's active organization.
    const { data: role } = await auth.context.supabase
        .from('custom_roles')
        .select('id')
        .eq('id', roleId)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!role) return { success: false, error: 'Role not found.' };

    const { error } = await auth.context.supabase
        .from('role_assignments')
        .upsert(
            {
                organization_id: auth.organizationId,
                user_id: userId,
                role_id: roleId,
                granted_by: auth.userId,
                expires_at: expiresAt ?? null,
            },
            { onConflict: 'organization_id,user_id,role_id' },
        );

    if (error) {
        console.error('[assignRole]', error.message);
        return { success: false, error: 'Unable to assign the role. Please try again.' };
    }

    revalidatePath('/admin/rbac');
    return { success: true, error: null };
}

/** Revokes a custom role assignment from a member. */
export async function unassignRole(
    input: unknown,
): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.rbac.manage);
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = unassignSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Invalid role assignment.' };
    const { roleId, userId } = parsed.data;

    const { error } = await auth.context.supabase
        .from('role_assignments')
        .delete()
        .eq('organization_id', auth.organizationId)
        .eq('role_id', roleId)
        .eq('user_id', userId);

    if (error) {
        console.error('[unassignRole]', error.message);
        return { success: false, error: 'Unable to remove the assignment. Please try again.' };
    }

    revalidatePath('/admin/rbac');
    return { success: true, error: null };
}

/**
 * Enterprise Multi-Org Branch Hierarchy: Fetch all child branch organizations under an HQ node.
 */
export async function getChildOrganizations(): Promise<{ data: Array<{ id: string; name: string; slug: string }> | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.rbac.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', auth.organizationId);

    if (error) return { data: null, error: 'Unable to load branch organizations.' };
    return { data, error: null };
}

/**
 * Enterprise Branch Audit Guard: Verify if active user has parent HQ authority over target branch org.
 */
export async function verifyBranchAccess(targetOrgId: string): Promise<boolean> {
    const auth = await authorizePermission(PERMISSIONS.rbac.read);
    if (!auth.ok) return false;
    return auth.organizationId === targetOrgId;
}

