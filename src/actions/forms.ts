'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type {
    FormDefinition,
    FormDefinitionInsert,
    FormDefinitionUpdate,
    FormSubmission,
} from '@/types/domain/forms';

/** Get all form definitions for the active organization. */
export async function getFormDefinitions(): Promise<{ data: FormDefinition[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.forms.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('form_definitions')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load forms. Please try again.' };
    return { data, error: null };
}

/** Get a single form definition (scoped to the active organization). */
export async function getFormDefinition(id: string): Promise<{ data: FormDefinition | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.forms.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('form_definitions')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Form not found.' };
    return { data, error: null };
}

/** Create a form definition. */
export async function createFormDefinition(input: Omit<FormDefinitionInsert, 'organization_id'>): Promise<{ data: FormDefinition | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.forms.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('form_definitions')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[createFormDefinition]', error.message);
        return { data: null, error: 'Unable to create form. Please check the provided data.' };
    }

    revalidatePath('/admin/forms');
    return { data, error: null };
}

/** Update a form definition (organization-scoped, cannot change organization). */
export async function updateFormDefinition(id: string, input: FormDefinitionUpdate): Promise<{ data: FormDefinition | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.forms.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a form.' };
    }

    const { data, error } = await auth.context.supabase
        .from('form_definitions')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateFormDefinition]', error.message);
        return { data: null, error: 'Unable to update form. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Form not found.' };

    revalidatePath('/admin/forms');
    revalidatePath(`/admin/forms/${id}`);
    return { data, error: null };
}

/** Delete a form definition (organization-scoped). */
export async function deleteFormDefinition(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.forms.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('form_definitions')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteFormDefinition]', error.message);
        return { error: 'Unable to delete form. Please try again.' };
    }
    if (!data) return { error: 'Form not found.' };

    revalidatePath('/admin/forms');
    return { error: null };
}

/** Get submissions for the organization (optionally filtered by form). */
export async function getFormSubmissions(formId?: string): Promise<{ data: FormSubmission[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.forms.read);
    if (!auth.ok) return { data: null, error: auth.error };

    let query = auth.context.supabase
        .from('form_submissions')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('submitted_at', { ascending: false });

    if (formId) query = query.eq('form_id', formId);

    const { data, error } = await query;
    if (error) return { data: null, error: 'Unable to load form submissions. Please try again.' };
    return { data, error: null };
}

/** Delete a form submission (organization-scoped). */
export async function deleteFormSubmission(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.forms.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('form_submissions')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteFormSubmission]', error.message);
        return { error: 'Unable to delete form submission. Please try again.' };
    }
    if (!data) return { error: 'Form submission not found.' };

    revalidatePath('/admin/forms');
    return { error: null };
}

// ---------------------------------------------------------------------------
// Page-facing aliases (used by the forms admin pages)
// ---------------------------------------------------------------------------

/** Alias of getFormDefinitions. */
export async function getForms(): Promise<{ data: FormDefinition[] | null; error: string | null }> {
    return getFormDefinitions();
}

/** Alias of createFormDefinition. */
export async function createForm(input: Omit<FormDefinitionInsert, 'organization_id'>): Promise<{ data: FormDefinition | null; error: string | null }> {
    return createFormDefinition(input);
}

