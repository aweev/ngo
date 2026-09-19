'use server';

import { revalidatePath } from 'next/cache';
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
