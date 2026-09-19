'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface InvitationPreview {
    valid: boolean;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    organizationName?: string;
    inviterName?: string;
    userExists: boolean;
}

/**
 * Validate an invitation token (public - no auth required).
 * Backed by the validate_invitation SECURITY DEFINER function.
 */
export async function validateInvitation(token: string): Promise<InvitationPreview> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('validate_invitation', { p_token: token });

    if (error || !data) {
        console.error('Error validating invitation:', error);
        return { valid: false, email: '', role: 'member', userExists: false };
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
        valid: Boolean(row?.valid),
        email: row?.email ?? '',
        role: row?.role ?? 'member',
        firstName: row?.first_name ?? undefined,
        lastName: row?.last_name ?? undefined,
        organizationName: row?.organization_name ?? undefined,
        inviterName: row?.inviter_name ?? undefined,
        userExists: Boolean(row?.user_exists),
    };
}

/**
 * Accept an invitation as the currently signed-in user (public page, authenticated user).
 * Grants organization membership via the accept_invitation SECURITY DEFINER function.
 */
export async function acceptInvitation(token: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });

    if (error) {
        console.error('Error accepting invitation:', error);
        return { success: false, error: 'Unable to accept the invitation right now. Please try again later.' };
    }

    const result = (typeof data === 'string' ? JSON.parse(data) : data) as { success: boolean; error?: string };

    if (!result?.success) {
        return { success: false, error: result?.error || 'Failed to accept invitation' };
    }

    return { success: true, error: null };
}
