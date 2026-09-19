'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Integration, IntegrationInsert, IntegrationUpdate, Webhook, WebhookInsert, WebhookUpdate, WebhookDelivery } from '@/types/domain/integrations';

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

/** Get all integrations for the active organization. */
export async function getIntegrations(): Promise<{ data: Integration[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.integrations.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load integrations. Please try again.' };
    return { data, error: null };
}

/** Get a single integration (scoped to the active organization). */
export async function getIntegration(id: string): Promise<{ data: Integration | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.integrations.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('integrations')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Integration not found.' };
    return { data, error: null };
}

/** Register a new integration (created inactive â€” enable after validation). */
export async function createIntegration(input: Omit<IntegrationInsert, 'organization_id' | 'status'>): Promise<{ data: Integration | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.integrations.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('integrations')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            status: 'pending',
            created_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[createIntegration]', error.message);
        return { data: null, error: 'Unable to create integration. Please check the provided data.' };
    }

    revalidatePath('/admin/integrations');
    return { data, error: null };
}

/** Update an integration (organization-scoped, cannot change organization). */
export async function updateIntegration(id: string, input: IntegrationUpdate): Promise<{ data: Integration | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.integrations.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of an integration.' };
    }

    const { data, error } = await auth.context.supabase
        .from('integrations')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateIntegration]', error.message);
        return { data: null, error: 'Unable to update integration. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Integration not found.' };

    revalidatePath('/admin/integrations');
    return { data, error: null };
}

/** Delete an integration (organization-scoped). */
export async function deleteIntegration(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.integrations.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('integrations')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteIntegration]', error.message);
        return { error: 'Unable to delete integration. Please try again.' };
    }
    if (!data) return { error: 'Integration not found.' };

    revalidatePath('/admin/integrations');
    return { error: null };
}

/** Enable or disable an integration (status change, never auto-activates secrets). */
export async function setIntegrationStatus(
    id: string,
    status: 'active' | 'inactive',
): Promise<{ data: Integration | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.integrations.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('integrations')
        .update({ status })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[setIntegrationStatus]', error.message);
        return { data: null, error: 'Unable to update the integration status. Please try again.' };
    }
    if (!data) return { data: null, error: 'Integration not found.' };

    revalidatePath('/admin/integrations');
    return { data, error: null };
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

/** Get all outgoing webhooks for the active organization. */
export async function getWebhooks(): Promise<{ data: Webhook[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.integrations.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('webhooks')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load webhooks. Please try again.' };
    return { data, error: null };
}

/** Get a single webhook (scoped to the active organization). */
export async function getWebhook(id: string): Promise<{ data: Webhook | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.integrations.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('webhooks')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Webhook not found.' };
    return { data, error: null };
}

/** Register an outgoing webhook (created inactive by default for safety). */
export async function createWebhook(input: Omit<WebhookInsert, 'organization_id' | 'is_active'>): Promise<{ data: Webhook | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.integrations.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('webhooks')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            is_active: false,
            created_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[createWebhook]', error.message);
        return { data: null, error: 'Unable to create webhook. Please check the provided data.' };
    }

    revalidatePath('/admin/integrations/webhooks');
    return { data, error: null };
}

/** Update a webhook (organization-scoped, cannot change organization). */
export async function updateWebhook(id: string, input: WebhookUpdate): Promise<{ data: Webhook | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.integrations.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a webhook.' };
    }

    const { data, error } = await auth.context.supabase
        .from('webhooks')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateWebhook]', error.message);
        return { data: null, error: 'Unable to update webhook. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Webhook not found.' };

    revalidatePath('/admin/integrations/webhooks');
    return { data, error: null };
}


/** Enable or disable a webhook. */
export async function toggleWebhook(id: string, is_active: boolean): Promise<{ data: Webhook | null; error: string | null }> {
    return updateWebhook(id, { is_active });
}

/** Delete a webhook (organization-scoped). */
export async function deleteWebhook(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.integrations.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('webhooks')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteWebhook]', error.message);
        return { error: 'Unable to delete webhook. Please try again.' };
    }
    if (!data) return { error: 'Webhook not found.' };

    revalidatePath('/admin/integrations/webhooks');
    return { error: null };
}

/** Get the delivery log for a webhook (organization-scoped, most recent first). */
export async function getWebhookDeliveries(webhookId: string, limit = 20): Promise<{ data: WebhookDelivery[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.integrations.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('webhook_deliveries')
        .select('*')
        .eq('webhook_id', webhookId)
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return { data: null, error: 'Unable to load webhook deliveries. Please try again.' };
    return { data, error: null };
}