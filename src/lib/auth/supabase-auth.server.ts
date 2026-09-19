import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Server-side session helpers (Server Components, Server Actions, Route Handlers only).
 */

/**
 * Get the current user session (server-side)
 */
export async function getSession() {
    const supabase = await createSupabaseServerClient();

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
        return { error: error.message, session: null };
    }

    return { session, error: null };
}

/**
 * Get the current user (server-side)
 */
export async function getCurrentUser() {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
        return { error: error.message, user: null };
    }

    return { user, error: null };
}

/**
 * Get the current user's organization membership
 */
export async function getCurrentUserMembership() {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { membership: null, error: 'Not authenticated' };
    }

    const { data: membership, error } = await supabase
        .from('organization_members')
        .select('*, organization:organizations(*)')
        .eq('user_id', user.id)
        .single();

    if (error) {
        return { membership: null, error: error.message };
    }

    return { membership, error: null };
}