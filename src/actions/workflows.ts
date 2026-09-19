'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type {
    WorkflowDefinition,
    WorkflowDefinitionInsert,
    WorkflowDefinitionUpdate,
    WorkflowInstance,
} from '@/types/domain/workflows';

/** Get all workflow definitions for the active organization. */
export async function getWorkflowDefinitions(): Promise<{ data: WorkflowDefinition[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workflows.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('workflow_definitions')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load workflow definitions. Please try again.' };
    return { data, error: null };
}

/** Get a single workflow definition (scoped to the active organization). */
export async function getWorkflowDefinition(id: string): Promise<{ data: WorkflowDefinition | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workflows.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('workflow_definitions')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Workflow definition not found.' };
    return { data, error: null };
}

/** Create a workflow definition. */
export async function createWorkflowDefinition(input: Omit<WorkflowDefinitionInsert, 'organization_id'>): Promise<{ data: WorkflowDefinition | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workflows.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('workflow_definitions')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[createWorkflowDefinition]', error.message);
        return { data: null, error: 'Unable to create workflow definition. Please check the provided data.' };
    }

    revalidatePath('/admin/workflows');
    return { data, error: null };
}

/** Update a workflow definition (organization-scoped, cannot change organization). */
export async function updateWorkflowDefinition(id: string, input: WorkflowDefinitionUpdate): Promise<{ data: WorkflowDefinition | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workflows.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a workflow definition.' };
    }

    const { data, error } = await auth.context.supabase
        .from('workflow_definitions')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateWorkflowDefinition]', error.message);
        return { data: null, error: 'Unable to update workflow definition. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Workflow definition not found.' };

    revalidatePath('/admin/workflows');
    return { data, error: null };
}

/** Delete a workflow definition (organization-scoped). */
export async function deleteWorkflowDefinition(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workflows.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('workflow_definitions')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteWorkflowDefinition]', error.message);
        return { error: 'Unable to delete workflow definition. Please try again.' };
    }
    if (!data) return { error: 'Workflow definition not found.' };

    revalidatePath('/admin/workflows');
    return { error: null };
}

/** Get workflow instances (organization-scoped, optional filters). */
export async function getWorkflowInstances(filter?: { status?: string; definitionId?: string }): Promise<{ data: WorkflowInstance[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workflows.read);
    if (!auth.ok) return { data: null, error: auth.error };

    let query = auth.context.supabase
        .from('workflow_instances')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (filter?.status) query = query.eq('status', filter.status);
    if (filter?.definitionId) query = query.eq('definition_id', filter.definitionId);

    const { data, error } = await query;
    if (error) return { data: null, error: 'Unable to load workflow instances. Please try again.' };
    return { data, error: null };
}

/** Get a single workflow instance (scoped to the active organization). */
export async function getWorkflowInstance(id: string): Promise<{ data: WorkflowInstance | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workflows.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('workflow_instances')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Workflow instance not found.' };
    return { data, error: null };
}

/** Manually trigger a workflow instance. */
export async function triggerWorkflow(definitionId: string, contextData: Record<string, unknown> = {}): Promise<{ data: WorkflowInstance | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.workflows.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('workflow_instances')
        .insert({
            organization_id: auth.organizationId,
            definition_id: definitionId,
            status: 'running',
            current_step_index: 0,
            context_data: contextData,
            step_history: [],
            started_at: new Date().toISOString(),
            triggered_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[triggerWorkflow]', error.message);
        return { data: null, error: 'Unable to trigger workflow. Please check the workflow definition.' };
    }

    revalidatePath('/admin/workflows');
    return { data, error: null };
}

