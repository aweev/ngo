'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Tag, TagInsert, TagUpdate, TagAssignment } from '@/types/domain/tags';

/** Get all tags for the active organization. */
export async function getTags(): Promise<{ data: Tag[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.tags.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('tags')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('name', { ascending: true });

    if (error) return { data: null, error: 'Unable to load tags. Please try again.' };
    return { data, error: null };
}

/** Create a tag. */
export async function createTag(input: Omit<TagInsert, 'organization_id'>): Promise<{ data: Tag | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.tags.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('tags')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[createTag]', error.message);
        return { data: null, error: 'Unable to create tag. Please check the provided data.' };
    }

    revalidatePath('/admin/tags');
    return { data, error: null };
}

/** Update a tag (organization-scoped, cannot change organization). */
export async function updateTag(id: string, input: TagUpdate): Promise<{ data: Tag | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.tags.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a tag.' };
    }

    const { data, error } = await auth.context.supabase
        .from('tags')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateTag]', error.message);
        return { data: null, error: 'Unable to update tag. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Tag not found.' };

    revalidatePath('/admin/tags');
    return { data, error: null };
}

/** Delete a tag (organization-scoped). */
export async function deleteTag(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.tags.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('tags')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteTag]', error.message);
        return { error: 'Unable to delete tag. Please try again.' };
    }
    if (!data) return { error: 'Tag not found.' };

    revalidatePath('/admin/tags');
    return { error: null };
}

/** Get tag assignments for an entity (organization-scoped). */
export async function getTagAssignments(entityType: string, entityId: string): Promise<{ data: TagAssignment[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.tags.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('tag_assignments')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

    if (error) return { data: null, error: 'Unable to load tag assignments. Please try again.' };
    return { data, error: null };
}

/** Assign a tag to an entity (organization-scoped). */
export async function assignTag(tagId: string, entityType: string, entityId: string): Promise<{ data: TagAssignment | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.tags.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('tag_assignments')
        .insert({
            organization_id: auth.organizationId,
            tag_id: tagId,
            entity_type: entityType,
            entity_id: entityId,
            created_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[assignTag]', error.message);
        return { data: null, error: 'Unable to assign tag. Please try again.' };
    }

    revalidatePath('/admin/tags');
    return { data, error: null };
}

/** Remove a tag assignment (organization-scoped). */
export async function unassignTag(assignmentId: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.tags.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('tag_assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[unassignTag]', error.message);
        return { error: 'Unable to remove tag assignment. Please try again.' };
    }
    if (!data) return { error: 'Tag assignment not found.' };

    revalidatePath('/admin/tags');
    return { error: null };
}
