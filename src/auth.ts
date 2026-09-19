import { getAuthContext, type AuthContextMembership } from '@/lib/auth/guards';
import type { AppRole } from '@/lib/auth/permissions';

export type { AppRole };

export interface AuthUser {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    role: AppRole;
}

export interface AuthSession {
    user: AuthUser;
    /** Active organization (null when the user has no membership yet). */
    organizationId: string | null;
    organizationName: string | null;
    memberships: AuthContextMembership[];
}

/**
 * Supabase-backed auth() replacement for next-auth's auth().
 * Returns the current session (user + active organization context) or null.
 *
 * Multi-organization aware: the active organization comes from the
 * `awe_active_org` cookie, falling back to the user's oldest membership.
 */
export async function auth(): Promise<AuthSession | null> {
    const ctx = await getAuthContext();
    if (!ctx) return null;

    return {
        user: {
            id: ctx.userId,
            email: ctx.email,
            name: ctx.name,
            image: ctx.image,
            role: ctx.role,
        },
        organizationId: ctx.organizationId,
        organizationName: ctx.organizationName,
        memberships: ctx.memberships,
    };
}