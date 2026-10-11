'use server';

import { revalidatePath } from 'next/cache';
import { revalidatePublicProgramRoutes } from '@/lib/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Project, ProjectInsert, ProjectUpdate } from '@/types/domain/projects';

const TABLE = 'projects';

/** Get all projects for the active organization. */
export async function getProjects(): Promise<{ data: Project[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.projects.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load projects. Please try again.' };
    return { data, error: null };
}

/** Get a single project by ID (scoped to the active organization). */
export async function getProject(id: string): Promise<{ data: Project | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.projects.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Project not found.' };
    return { data, error: null };
}

/** Create a new project. */
export async function createProject(input: Omit<ProjectInsert, 'organization_id'>): Promise<{ data: Project | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.projects.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .insert({ ...input, organization_id: auth.organizationId })
        .select()
        .single();

    if (error) {
        console.error('[createProject]', error.message);
        return { data: null, error: 'Unable to create project. Please check the provided data.' };
    }

    revalidatePath('/admin/projects');
    revalidatePublicProgramRoutes();
    return { data, error: null };
}

/** Update an existing project (organization-scoped, cannot change organization). */
export async function updateProject(id: string, input: ProjectUpdate): Promise<{ data: Project | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.projects.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a project.' };
    }

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateProject]', error.message);
        return { data: null, error: 'Unable to update project. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Project not found.' };

    revalidatePath('/admin/projects');
    revalidatePath(`/admin/projects/${id}`);
    revalidatePublicProgramRoutes();
    return { data, error: null };
}

/** Delete a project (organization-scoped). */
export async function deleteProject(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.projects.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteProject]', error.message);
        return { error: 'Unable to delete project. Please try again.' };
    }
    if (!data) return { error: 'Project not found.' };

    revalidatePath('/admin/projects');
    revalidatePublicProgramRoutes();
    return { error: null };
}

export async function getProjectsStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    totalBudget: number;
    totalSpent: number;
    error: string | null;
}> {
    const auth = await authorizePermission(PERMISSIONS.projects.read);
    if (!auth.ok) return { total: 0, active: 0, completed: 0, totalBudget: 0, totalSpent: 0, error: auth.error };

    const { data, error } = await auth.context.supabase.from(TABLE).select('status, budget, spent');
    if (error) return { total: 0, active: 0, completed: 0, totalBudget: 0, totalSpent: 0, error: 'Unable to load project statistics.' };

    return {
        total: data.length,
        active: data.filter(p => p.status === 'active').length,
        completed: data.filter(p => p.status === 'completed').length,
        totalBudget: data.reduce((sum, p) => sum + (p.budget || 0), 0),
        totalSpent: data.reduce((sum, p) => sum + (p.spent || 0), 0),
        error: null,
    };
}

/** Get active projects for the field app (minimal fields, includes registration_mode). */
export async function getProjectsForField(): Promise<{ data: { id: string; name: string; slug: string; category: string | null; registration_mode: string }[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.projects.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('id, name, slug, category, registration_mode')
        .eq('organization_id', auth.organizationId)
        .eq('status', 'active')
        .order('name', { ascending: true });

    if (error) return { data: null, error: 'Unable to load projects.' };
    return { data: data ?? [], error: null };
}

/** Determine default registration_mode based on project category. */
export function getDefaultRegistrationMode(category: string | null): 'household' | 'individual' | 'both' {
    if (!category) return 'household';
    const cat = category.toLowerCase();
    // Health/protection sectors → individual registration
    if (cat.includes('health') || cat.includes('protection') || cat.includes('nutrition') || cat.includes('wash')) {
        return 'individual';
    }
    // Cash/voucher/food/livelihoods → household registration
    if (cat.includes('cash') || cat.includes('voucher') || cat.includes('food') || cat.includes('livelihood') || cat.includes('shelter')) {
        return 'household';
    }
    return 'household';
}
