'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authorizePermission } from '@/lib/auth/guards';
import { APP_ROLES, type AppRole } from '@/lib/auth/permissions';
import { ENV } from '@/lib/env';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export interface OrgMember {
    userId: string;
    email: string | null;
    name: string | null;
    role: AppRole;
    joinedAt: string | null;
}

export interface OrgInvitation {
    id: string;
    email: string;
    role: AppRole;
    firstName: string | null;
    lastName: string | null;
    status: string;
    expiresAt: string;
    createdAt: string;
    /** Full claim link — only ever returned to staff with members.read. */
    claimLink: string;
}

const INVITE_TTL_DAYS = 7;

const inviteSchema = z.object({
    email: z.string().trim().toLowerCase().email().max(200),
    role: z.enum(APP_ROLES),
    firstName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
    locale: z.string().max(8).default('en'),
    /** Attempt Supabase invite email; the claim link is always returned as fallback. */
    sendEmail: z.boolean().default(true),
});

const roleSchema = z.object({
    userId: z.string().uuid(),
    role: z.enum(APP_ROLES),
});

function claimLinkFor(token: string, locale: string): string {
    const origin = (ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const loc = locale && locale.length >= 2 ? locale : 'en';
    return `${origin}/${loc}/auth/invite/${token}`;
}

/**
 * Organization roster with display names/emails.
 * Emails resolve through the service-role client (auth.users is invisible to
 * RLS callers) — gated by members.read, so only staff ever see this.
 */
export async function getMembers(): Promise<{ data: OrgMember[]; error: string | null }> {
    const auth = await authorizePermission('members.read');
    if (!auth.ok) return { data: [], error: auth.error };

    const admin = createSupabaseAdminClient();
    const { data: rows, error } = await admin
        .from('organization_members')
        .select('user_id, role, joined_at')
        .eq('organization_id', auth.organizationId)
        .order('joined_at', { ascending: true });
    if (error) return { data: [], error: 'Unable to load the team roster.' };

    // Map user_id -> email/name (paginated; NGO rosters fit in a few pages).
    const directory = new Map<string, { email: string | null; name: string | null }>();
    let page = 1;
    for (;;) {
        const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 100 });
        if (listError || !data?.users?.length) break;
        for (const u of data.users) {
            const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
            const full = typeof meta.full_name === 'string' ? meta.full_name : null;
            const joined = [meta.first_name, meta.last_name]
                .filter((v): v is string => typeof v === 'string' && v.length > 0)
                .join(' ') || null;
            directory.set(u.id, { email: u.email ?? null, name: full ?? joined });
        }
        if (data.users.length < 100 || page >= 10) break;
        page += 1;
    }

    return {
        data: (rows ?? []).map((r) => ({
            userId: r.user_id as string,
            email: directory.get(r.user_id as string)?.email ?? null,
            name: directory.get(r.user_id as string)?.name ?? null,
            role: (r.role as AppRole) ?? 'member',
            joinedAt: (r.joined_at as string | null) ?? null,
        })),
        error: null,
    };
}

/** Pending + recent invitations for the active organization. */
export async function getInvitations(
    locale = 'en',
): Promise<{ data: OrgInvitation[]; error: string | null }> {
    const auth = await authorizePermission('members.read');
    if (!auth.ok) return { data: [], error: auth.error };

    const { data, error } = await auth.supabase
        .from('invitations')
        .select('id, email, role, first_name, last_name, status, token, expires_at, created_at')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false })
        .limit(50);
    if (error) return { data: [], error: 'Unable to load invitations.' };

    return {
        data: (data ?? []).map((row) => ({
            id: row.id as string,
            email: row.email as string,
            role: (row.role as AppRole) ?? 'member',
            firstName: (row.first_name as string | null) ?? null,
            lastName: (row.last_name as string | null) ?? null,
            status: row.status as string,
            expiresAt: row.expires_at as string,
            createdAt: row.created_at as string,
            claimLink: claimLinkFor(row.token as string, locale),
        })),
        error: null,
    };
}

/**
 * Invites someone to the active organization.
 * Idempotent: an already-pending invite for the same email is re-returned
 * (with a fresh link) instead of creating a duplicate row.
 * Only owners may invite fellow owners.
 *
 * Delivery is two-channel: a Supabase invite email (when SMTP/Auth mail is
 * configured and the address is new) plus the claim link, which is always
 * returned so the inviter can share it manually as fallback.
 */
export async function inviteMember(
    input: unknown,
): Promise<{ success: boolean; claimLink?: string; emailSent?: boolean; error: string | null }> {
    const auth = await authorizePermission('members.manage');
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Enter a valid email address and role.' };
    const { email, role, firstName, lastName, locale, sendEmail } = parsed.data;

    if (role === 'owner' && auth.role !== 'owner') {
        return { success: false, error: 'Only owners can invite fellow owners.' };
    }

    const admin = createSupabaseAdminClient();

    // Already on the team?
    const invitedUserId = await userIdForEmail(admin, email);
    if (invitedUserId) {
        const { data: member } = await auth.supabase
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', auth.organizationId)
            .eq('user_id', invitedUserId)
            .maybeSingle();
        if (member) return { success: false, error: 'This person is already on the team.' };
    }

    // Reuse a live pending invite (idempotent retry).
    const { data: pending } = await auth.supabase
        .from('invitations')
        .select('token')
        .eq('organization_id', auth.organizationId)
        .eq('email', email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
    if (pending?.token) {
        const claimLink = claimLinkFor(pending.token as string, locale);
        const emailSent = sendEmail ? await sendInviteEmail(admin, email, claimLink, firstName, lastName) : false;
        return { success: true, claimLink, emailSent, error: null };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000).toISOString();
    const { error } = await auth.supabase.from('invitations').insert({
        organization_id: auth.organizationId,
        email,
        token,
        role,
        first_name: firstName || null,
        last_name: lastName || null,
        invited_by: auth.userId,
        status: 'pending',
        expires_at: expiresAt,
    });
    if (error) return { success: false, error: 'Unable to create the invitation. Please try again.' };

    const claimLink = claimLinkFor(token, locale);
    const emailSent = sendEmail ? await sendInviteEmail(admin, email, claimLink, firstName, lastName) : false;

    revalidatePath('/admin/members');
    return { success: true, claimLink, emailSent, error: null };
}

/**
 * Sends the Supabase invite email pointing at our claim link.
 * Best-effort by design: returns false (never throws) when mail is
 * unconfigured, rate-limited, or the address already has an account —
 * the caller always falls back to sharing the claim link manually.
 * NOTE: the app URL must be allowlisted under Supabase Auth > Redirect URLs.
 */
async function sendInviteEmail(
    admin: ReturnType<typeof createSupabaseAdminClient>,
    email: string,
    claimLink: string,
    firstName?: string,
    lastName?: string,
): Promise<boolean> {
    try {
        const { error } = await admin.auth.admin.inviteUserByEmail(email, {
            redirectTo: claimLink,
            data: {
                first_name: firstName || undefined,
                last_name: lastName || undefined,
            },
        });
        if (error) return false;
        return true;
    } catch {
        return false;
    }
}

/** Revokes a pending invitation so its link stops working. */
export async function revokeInvitation(id: string): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizePermission('members.manage');
    if (!auth.ok) return { success: false, error: auth.error };
    if (!id || typeof id !== 'string') return { success: false, error: 'Invalid invitation.' };

    const { error } = await auth.supabase
        .from('invitations')
        .update({ status: 'revoked', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .eq('status', 'pending');
    if (error) return { success: false, error: 'Unable to revoke the invitation.' };

    revalidatePath('/admin/members');
    return { success: true, error: null };
}

/**
 * Changes a member's role. Guards: no self-demotion (prevents lockout),
 * the last owner can never be demoted, and only owners grant owner.
 */
export async function updateMemberRole(
    input: unknown,
): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizePermission('members.manage');
    if (!auth.ok) return { success: false, error: auth.error };

    const parsed = roleSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Invalid role change.' };
    const { userId, role } = parsed.data;

    if (userId === auth.userId) {
        return { success: false, error: 'You cannot change your own role. Ask a fellow owner.' };
    }
    if (role === 'owner' && auth.role !== 'owner') {
        return { success: false, error: 'Only owners can grant the owner role.' };
    }

    const { data: target } = await auth.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', auth.organizationId)
        .eq('user_id', userId)
        .maybeSingle();
    if (!target) return { success: false, error: 'Member not found.' };

    if ((target.role as string) === 'owner' && role !== 'owner' && !(await hasAnotherOwner(auth.supabase, auth.organizationId, userId))) {
        return { success: false, error: 'This is the last owner. Promote someone else first.' };
    }

    const { error } = await auth.supabase
        .from('organization_members')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('organization_id', auth.organizationId)
        .eq('user_id', userId);
    if (error) return { success: false, error: 'Unable to update the role.' };

    revalidatePath('/admin/members');
    return { success: true, error: null };
}

/**
 * Removes a member. Guards: no self-removal, last owner is protected.
 */
export async function removeMember(userId: string): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizePermission('members.manage');
    if (!auth.ok) return { success: false, error: auth.error };
    if (!userId || typeof userId !== 'string') return { success: false, error: 'Invalid member.' };
    if (userId === auth.userId) {
        return { success: false, error: 'You cannot remove yourself.' };
    }

    const { data: target } = await auth.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', auth.organizationId)
        .eq('user_id', userId)
        .maybeSingle();
    if (!target) return { success: false, error: 'Member not found.' };

    if ((target.role as string) === 'owner' && !(await hasAnotherOwner(auth.supabase, auth.organizationId, userId))) {
        return { success: false, error: 'This is the last owner. Promote someone else first.' };
    }

    const { error } = await auth.supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', auth.organizationId)
        .eq('user_id', userId);
    if (error) return { success: false, error: 'Unable to remove the member.' };

    revalidatePath('/admin/members');
    return { success: true, error: null };
}

// ---------------------------------------------------------------------------
// Helpers (not exported as actions)
// ---------------------------------------------------------------------------

async function userIdForEmail(
    admin: ReturnType<typeof createSupabaseAdminClient>,
    email: string,
): Promise<string | null> {
    // listUsers has no email filter; scan pages (fine at NGO scale).
    let page = 1;
    for (;;) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error || !data?.users?.length) break;
        const match = data.users.find((u) => u.email?.toLowerCase() === email);
        if (match) return match.id;
        if (data.users.length < 200 || page >= 10) break;
        page += 1;
    }
    return null;
}

async function hasAnotherOwner(
    supabase: import('@supabase/supabase-js').SupabaseClient,
    organizationId: string,
    exceptUserId: string,
): Promise<boolean> {
    const { data } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('role', 'owner')
        .neq('user_id', exceptUserId)
        .limit(1);
    return (data?.length ?? 0) > 0;
}
