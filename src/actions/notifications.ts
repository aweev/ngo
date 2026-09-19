'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission, authorizeUser } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type {
    Notification,
    NotificationTemplate,
    NotificationTemplateInsert,
    NotificationTemplateUpdate,
} from '@/types/domain/notifications';

/** Get the current user's own notifications (allowed for every member). */
export async function getNotifications(): Promise<{ data: Notification[] | null; error: string | null }> {
    const auth = await authorizeUser();
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', auth.context.userId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load notifications. Please try again.' };
    return { data, error: null };
}

/** Mark one of the current user's own notifications as read. */
export async function markNotificationRead(id: string): Promise<{ error: string | null }> {
    const auth = await authorizeUser();
    if (!auth.ok) return { error: auth.error };

    const { error } = await auth.context.supabase
        .from('notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('recipient_id', auth.context.userId);

    if (error) return { error: 'Unable to update the notification. Please try again.' };
    revalidatePath('/admin/notifications');
    return { error: null };
}

/** Get all notification templates for the active organization. */
export async function getNotificationTemplates(): Promise<{ data: NotificationTemplate[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.notifications.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('notification_templates')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load notification templates. Please try again.' };
    return { data, error: null };
}

/** Get a single notification template (scoped to the active organization). */
export async function getNotificationTemplate(id: string): Promise<{ data: NotificationTemplate | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.notifications.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('notification_templates')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Notification template not found.' };
    return { data, error: null };
}

/** Create a notification template. */
export async function createNotificationTemplate(input: Omit<NotificationTemplateInsert, 'organization_id'>): Promise<{ data: NotificationTemplate | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.notifications.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('notification_templates')
        .insert({ ...input, organization_id: auth.organizationId })
        .select()
        .single();

    if (error) {
        console.error('[createNotificationTemplate]', error.message);
        return { data: null, error: 'Unable to create the notification template. Please check the provided data.' };
    }

    revalidatePath('/admin/notifications');
    return { data, error: null };
}

/** Update a notification template (organization-scoped, cannot change organization). */
export async function updateNotificationTemplate(id: string, input: NotificationTemplateUpdate): Promise<{ data: NotificationTemplate | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.notifications.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a notification template.' };
    }

    const { data, error } = await auth.context.supabase
        .from('notification_templates')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateNotificationTemplate]', error.message);
        return { data: null, error: 'Unable to update the notification template. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Notification template not found.' };

    revalidatePath('/admin/notifications');
    return { data, error: null };
}

/** Delete a notification template (organization-scoped). */
export async function deleteNotificationTemplate(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.notifications.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('notification_templates')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteNotificationTemplate]', error.message);
        return { error: 'Unable to delete the notification template. Please try again.' };
    }
    if (!data) return { error: 'Notification template not found.' };

    revalidatePath('/admin/notifications');
    return { error: null };
}
