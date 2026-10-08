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

export interface NotificationPreferences {
    email_enabled: boolean;
    sms_enabled: boolean;
    push_enabled: boolean;
    in_app_enabled: boolean;
    digest_frequency: 'immediate' | 'daily' | 'weekly';
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
    /** IANA timezone for quiet hours (e.g. Europe/Berlin). Null = UTC. */
    timezone: string | null;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    in_app_enabled: true,
    digest_frequency: 'immediate',
    quiet_hours_start: null,
    quiet_hours_end: null,
    timezone: null,
};

/** True for real IANA zones; rejects garbage before it reaches the DB. */
function isValidTimezone(value: unknown): value is string {
    if (typeof value !== 'string' || !value) return false;
    try {
        Intl.DateTimeFormat(undefined, { timeZone: value });
        return true;
    } catch {
        return false;
    }
}

/**
 * The caller's own preferences for the active organization.
 * Every member may read their own row (RLS self-select); members without
 * one yet get the defaults without writing anything.
 */
export async function getMyNotificationPreferences(): Promise<{ data: NotificationPreferences; error: string | null }> {
    const auth = await authorizeUser();
    if (!auth.ok) return { data: DEFAULT_PREFERENCES, error: auth.error };
    if (!auth.context.hasOrganization || !auth.context.organizationId) {
        return { data: DEFAULT_PREFERENCES, error: null };
    }

    const { data, error } = await auth.context.supabase
        .from('notification_preferences')
        .select('email_enabled, sms_enabled, push_enabled, in_app_enabled, digest_frequency, quiet_hours_start, quiet_hours_end, timezone')
        .eq('organization_id', auth.context.organizationId)
        .eq('user_id', auth.context.userId)
        .maybeSingle();
    if (error || !data) return { data: DEFAULT_PREFERENCES, error: null };
    return {
        data: {
            email_enabled: (data.email_enabled as boolean) ?? true,
            sms_enabled: (data.sms_enabled as boolean) ?? false,
            push_enabled: (data.push_enabled as boolean) ?? true,
            in_app_enabled: (data.in_app_enabled as boolean) ?? true,
            digest_frequency: (['immediate', 'daily', 'weekly'] as const).includes(data.digest_frequency as never)
                ? (data.digest_frequency as NotificationPreferences['digest_frequency'])
                : 'immediate',
            quiet_hours_start: (data.quiet_hours_start as string | null) ?? null,
            quiet_hours_end: (data.quiet_hours_end as string | null) ?? null,
            timezone: isValidTimezone(data.timezone) ? (data.timezone as string) : null,
        },
        error: null,
    };
}

/**
 * Save the caller's own preferences (upsert keyed by org + user).
 * Channel toggles, digest cadence, and quiet hours for the dispatcher.
 */
export async function saveMyNotificationPreferences(
    input: Partial<NotificationPreferences>,
): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizeUser();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!auth.context.hasOrganization || !auth.context.organizationId) {
        return { success: false, error: 'Join an organization first.' };
    }

    const clean = {
        email_enabled: typeof input.email_enabled === 'boolean' ? input.email_enabled : true,
        sms_enabled: typeof input.sms_enabled === 'boolean' ? input.sms_enabled : false,
        push_enabled: typeof input.push_enabled === 'boolean' ? input.push_enabled : true,
        in_app_enabled: typeof input.in_app_enabled === 'boolean' ? input.in_app_enabled : true,
        digest_frequency: (['immediate', 'daily', 'weekly'] as const).includes(input.digest_frequency as never)
            ? (input.digest_frequency as NotificationPreferences['digest_frequency'])
            : 'immediate',
        quiet_hours_start: /^([01]\d|2[0-3]):[0-5]\d$/.test(input.quiet_hours_start ?? '') ? input.quiet_hours_start : null,
        quiet_hours_end: /^([01]\d|2[0-3]):[0-5]\d$/.test(input.quiet_hours_end ?? '') ? input.quiet_hours_end : null,
        timezone: isValidTimezone(input.timezone) ? (input.timezone as string) : null,
    };

    const { error } = await auth.context.supabase
        .from('notification_preferences')
        .upsert(
            {
                organization_id: auth.context.organizationId,
                user_id: auth.context.userId,
                ...clean,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'organization_id,user_id' },
        );
    if (error) {
        console.error('[saveMyNotificationPreferences]', error.message);
        return { success: false, error: 'Unable to save preferences. Please try again.' };
    }
    return { success: true, error: null };
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
