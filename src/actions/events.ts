'use server';

import { revalidatePath } from 'next/cache';
import { revalidatePublicEventRoutes } from '@/lib/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type {
    OrgEvent,
    OrgEventInsert,
    OrgEventUpdate
} from '@/types/domain/events';

/** Get all events for the active organization. */
export async function getEvents(): Promise<{ data: OrgEvent[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.events.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('org_events')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('start_date', { ascending: false });

    if (error) return { data: null, error: 'Unable to load events. Please try again.' };
    return { data, error: null };
}

/** Get a single event by ID (scoped to the active organization). */
export async function getEvent(id: string): Promise<{ data: OrgEvent | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.events.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('org_events')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Event not found.' };
    return { data, error: null };
}

/** Create a new event. */
export async function createEvent(input: Omit<OrgEventInsert, 'organization_id'>): Promise<{ data: OrgEvent | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.events.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('org_events')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[createEvent]', error.message);
        return { data: null, error: 'Unable to create event. Please check the provided data.' };
    }

    revalidatePath('/admin/events');
    revalidatePublicEventRoutes();
    return { data, error: null };
}

/** Update an event (organization-scoped, cannot change organization). */
export async function updateEvent(id: string, input: OrgEventUpdate): Promise<{ data: OrgEvent | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.events.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of an event.' };
    }

    const { data, error } = await auth.context.supabase
        .from('org_events')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateEvent]', error.message);
        return { data: null, error: 'Unable to update event. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Event not found.' };

    revalidatePath('/admin/events');
    revalidatePath(`/admin/events/${id}`);
    revalidatePublicEventRoutes();
    return { data, error: null };
}

/** Delete an event (organization-scoped). */
export async function deleteEvent(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.events.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('org_events')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteEvent]', error.message);
        return { error: 'Unable to delete event. Please try again.' };
    }
    if (!data) return { error: 'Event not found.' };

    revalidatePath('/admin/events');
    revalidatePublicEventRoutes();
    return { error: null };
}

export async function getEventsStats(): Promise<{
    total: number;
    upcoming: number;
    totalRegistrations: number;
    error: string | null;
}> {
    const auth = await authorizePermission(PERMISSIONS.events.read);
    if (!auth.ok) return { total: 0, upcoming: 0, totalRegistrations: 0, error: auth.error };

    const { data, error } = await auth.context.supabase.from('org_events').select('status, registered_count');
    if (error) return { total: 0, upcoming: 0, totalRegistrations: 0, error: 'Unable to load event statistics.' };

    const rows = data as { status: string; registered_count: number | null }[];
    return {
        total: rows.length,
        upcoming: rows.filter(e => e.status !== 'completed' && e.status !== 'cancelled').length,
        totalRegistrations: rows.reduce((sum, e) => sum + (e.registered_count || 0), 0),
        error: null,
    };
}

