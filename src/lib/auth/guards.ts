import { cache } from 'react';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
    ALL_PERMISSIONS,
    type AppRole,
    type CustomRoleGrantRow,
    type Permission,
    type PermissionOverrideRow,
    getPermissionExplanation,
    hasRole,
    isAssignmentActive,
    mergeEffectivePermissions,
} from './permissions';

/**
 * Server-only authorization guards.
 *
 * Use `require*()` helpers (throwing) in server components/layouts, and the
 * `authorize*()` helpers (result objects) inside Server Actions so they can
 * return stable `{ data, error }` results without leaking internals.
 */

/** Cookie that stores the user's active organization across requests. */
export const ACTIVE_ORG_COOKIE = 'awe_active_org';

export type AuthErrorCode = 'unauthenticated' | 'no_organization' | 'forbidden';

const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
    unauthenticated: 'You need to sign in to continue.',
    no_organization:
        'Your account is not linked to an organization yet. Please accept your invitation or contact an administrator.',
    forbidden: 'You do not have permission to perform this action.',
};

// ---------------------------------------------------------------------------
// Effective-permission resolution (base role + custom RBAC tables)
// ---------------------------------------------------------------------------

/**
 * Raw custom-RBAC rows for one (user, organization). Fetched once per
 * request next to the membership list so every guard shares a single
 * round-trip. RLS already scopes these tables to the caller's orgs via
 * the rbac.read / rbac.manage policies; the org filter below is
 * defense-in-depth.
 */
interface CustomGrantRows {
    customGrants: CustomRoleGrantRow[];
    overrides: PermissionOverrideRow[];
    customRoleIds: string[];
}

async function getCustomGrantRows(
    supabase: SupabaseClient,
    userId: string,
    organizationId: string,
): Promise<CustomGrantRows> {
    const empty: CustomGrantRows = { customGrants: [], overrides: [], customRoleIds: [] };
    try {
        const [{ data: assignments }, { data: roles }, { data: overrides }] = await Promise.all([
            supabase
                .from('role_assignments')
                .select('role_id, expires_at')
                .eq('user_id', userId)
                .eq('organization_id', organizationId),
            supabase
                .from('custom_roles')
                .select('id, permissions')
                .eq('organization_id', organizationId),
            supabase
                .from('permission_overrides')
                .select('permission_key, is_granted')
                .eq('user_id', userId)
                .eq('organization_id', organizationId),
        ]);
        const rolesById = new Map<string, Record<string, boolean>>();
        for (const r of (roles ?? []) as { id: string; permissions: unknown }[]) {
            if (r && typeof r.id === 'string' && r.permissions && typeof r.permissions === 'object') {
                rolesById.set(r.id, r.permissions as Record<string, boolean>);
            }
        }
        const assignmentRows = (assignments ?? []) as { role_id: string; expires_at: string | null }[];
        const customGrants: CustomRoleGrantRow[] = [];
        const customRoleIds: string[] = [];
        for (const a of assignmentRows) {
            if (typeof a?.role_id !== 'string') continue;
            const grants = rolesById.get(a.role_id);
            if (!grants) continue;
            customGrants.push({ role_id: a.role_id, permissions: grants, expires_at: a.expires_at ?? null });
            if (isAssignmentActive({ expires_at: a.expires_at ?? null })) {
                customRoleIds.push(a.role_id);
            }
        }
        return {
            customGrants,
            overrides: (overrides ?? []) as PermissionOverrideRow[],
            customRoleIds,
        };
    } catch {
        // Custom RBAC tables missing/unreadable (fresh DB, RLS deny):
        // fail closed to the base role — never fail the whole request.
        return empty;
    }
}

/**
 * Computes the effective permission set for a user:
 *   base role grants ∪ custom-role grants ∪ granted overrides ∖ denied overrides.
 *
 * Single source of truth is `mergeEffectivePermissions` (permissions.ts).
 */
export async function getEffectivePermissions(
    supabase: SupabaseClient,
    userId: string,
    organizationId: string,
    baseRole: AppRole,
): Promise<Set<Permission>> {
    const { customGrants, overrides } = await getCustomGrantRows(supabase, userId, organizationId);
    return mergeEffectivePermissions(baseRole, customGrants, overrides);
}

/**
 * Whether the user holds `permission` in `organizationId` via base role,
 * assigned custom roles, or per-user overrides. Fail-closed on any error.
 */
export async function userHasEffectivePermission(
    supabase: SupabaseClient,
    userId: string,
    organizationId: string,
    baseRole: AppRole,
    permission: Permission,
): Promise<boolean> {
    try {
        if (!(ALL_PERMISSIONS as readonly string[]).includes(permission)) {
            return false;
        }
        const effective = await getEffectivePermissions(supabase, userId, organizationId, baseRole);
        return effective.has(permission);
    } catch {
        return false;
    }
}

export interface AuthContextMembership {
    organizationId: string;
    role: AppRole;
    organizationName: string | null;
    joinedAt: string | null;
}

export interface AuthContext {
    supabase: SupabaseClient;
    userId: string;
    email: string | null;
    name: string | null;
    image: string | null;
    /** Role within the active organization ('member' when org-less). */
    role: AppRole;
    /** Active organization id (null when the user has no membership yet). */
    organizationId: string | null;
    organizationName: string | null;
    /** All organizations the user belongs to (for the org switcher). */
    memberships: AuthContextMembership[];
    hasOrganization: boolean;
    /**
     * Effective permissions for the active org: base role + non-expired
     * custom-role grants + per-user overrides. Empty when org-less.
     */
    effective: Set<Permission>;
    /** Ids of assigned, non-expired custom roles in the active org. */
    customRoleIds: string[];
}

export type AuthFailure = { ok: false; code: AuthErrorCode; error: string };

export type AuthCheck =
    | { ok: true; context: AuthContext }
    | AuthFailure;

/**
 * Organization-scoped check. The success branch flattens the context
 * accessors (supabase, userId, role, organizationId, …) so actions can write
 * `auth.organizationId` / `auth.supabase` directly.
 */
export interface OrgAuthSuccess {
    ok: true;
    context: AuthContext;
    supabase: SupabaseClient;
    userId: string;
    role: AppRole;
    organizationId: string;
    organizationName: string | null;
    hasOrganization: true;
    effective: Set<Permission>;
    customRoleIds: string[];
}

export type OrgAuthCheck = OrgAuthSuccess | AuthFailure;

function success(context: AuthContext): AuthCheck {
    return { ok: true, context };
}

export class AuthorizationError extends Error {
    constructor(
        public readonly code: AuthErrorCode,
        message: string,
    ) {
        super(message);
        this.name = 'AuthorizationError';
    }
}

function failure(code: AuthErrorCode, error?: string): AuthFailure {
    return { ok: false, code, error: error ?? AUTH_ERROR_MESSAGES[code] };
}

/**
 * Resolves the full auth context for the current request: the Supabase user,
 * every organization membership, and the active organization (from the
 * active-org cookie, falling back to the oldest membership). Cached per request.
 */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: rows } = await supabase
        .from('organization_members')
        .select('organization_id, role, joined_at, organization:organizations(name)')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true });

    const memberships: AuthContextMembership[] = (rows ?? []).map((row) => ({
        organizationId: row.organization_id as string,
        role: (row.role as AppRole) ?? 'member',
        organizationName: (row.organization as { name?: string } | null)?.name ?? null,
        joinedAt: (row.joined_at as string | null) ?? null,
    }));

    let active = memberships[0] ?? null;
    if (memberships.length > 1) {
        const cookieStore = await cookies();
        const wanted = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
        if (wanted) {
            const match = memberships.find((m) => m.organizationId === wanted);
            if (match) active = match;
        }
    }

    const metadata = user.user_metadata as Record<string, unknown> | null;

    const activeRole = active?.role ?? 'member';
    let effective = mergeEffectivePermissions(activeRole, [], []);
    let customRoleIds: string[] = [];
    if (active) {
        try {
            const grantRows = await getCustomGrantRows(supabase, user.id, active.organizationId);
            effective = mergeEffectivePermissions(activeRole, grantRows.customGrants, grantRows.overrides);
            customRoleIds = grantRows.customRoleIds;
        } catch {
            effective = mergeEffectivePermissions(activeRole, [], []);
        }
    }

    return {
        supabase,
        userId: user.id,
        email: user.email ?? null,
        name:
            (metadata?.full_name as string | undefined) ??
            ([metadata?.first_name, metadata?.last_name]
                .filter((value): value is string => typeof value === 'string' && value.length > 0)
                .join(' ') || null),
        image: (metadata?.avatar_url as string | undefined) ?? null,
        role: active?.role ?? 'member',
        organizationId: active?.organizationId ?? null,
        organizationName: active?.organizationName ?? null,
        memberships,
        hasOrganization: active !== null,
        effective,
        customRoleIds,
    };
});

// ---------------------------------------------------------------------------
// Non-throwing authorize* helpers (for Server Actions)
// ---------------------------------------------------------------------------

/** Requires an authenticated user. */
export async function authorizeUser(): Promise<AuthCheck> {
    const context = await getAuthContext();
    if (!context) return failure('unauthenticated');
    return success(context);
}

/** Requires an authenticated user that belongs to an organization. */
export async function authorizeOrganization(): Promise<OrgAuthCheck> {
    const check = await authorizeUser();
    if (!check.ok) return check;
    if (!check.context.hasOrganization || !check.context.organizationId) {
        return failure('no_organization');
    }
    return {
        ok: true,
        context: check.context,
        supabase: check.context.supabase,
        userId: check.context.userId,
        role: check.context.role,
        organizationId: check.context.organizationId,
        organizationName: check.context.organizationName,
        hasOrganization: true,
        effective: check.context.effective,
        customRoleIds: check.context.customRoleIds,
    };
}

/**
 * Requires an authenticated user inside an organization whose EFFECTIVE
 * permission set (base role + assigned custom roles + per-user overrides)
 * includes the given permission. The denial message explains which role
 * is required.
 */
export async function authorizePermission(permission: Permission): Promise<OrgAuthCheck> {
    const check = await authorizeOrganization();
    if (!check.ok) return check;
    const granted = await userHasEffectivePermission(
        check.supabase,
        check.userId,
        check.organizationId,
        check.role,
        permission,
    );
    if (!granted) {
        const explanation = getPermissionExplanation(check.role, permission);
        return failure('forbidden', explanation.message);
    }
    return check;
}

/** Requires an authenticated user inside an organization with one of the roles. */
export async function authorizeRole(roles: readonly AppRole[]): Promise<OrgAuthCheck> {
    const check = await authorizeOrganization();
    if (!check.ok) return check;
    if (!hasRole(check.role, roles)) {
        return failure(
            'forbidden',
            `You do not have permission to perform this action. Required role: ${roles.join(' or ')}.`,
        );
    }
    return check;
}

// ---------------------------------------------------------------------------
// Throwing require* helpers (for layouts, server components, trusted flows)
// ---------------------------------------------------------------------------

async function unwrap(
    check: AuthCheck | OrgAuthCheck | Promise<AuthCheck | OrgAuthCheck>,
): Promise<AuthContext> {
    const result = await check;
    if (!result.ok) throw new AuthorizationError(result.code, result.error);
    return result.context;
}

export function requireUser(): Promise<AuthContext> {
    return unwrap(authorizeUser());
}

export function requireOrganization(): Promise<AuthContext> {
    return unwrap(authorizeOrganization());
}

export function requirePermission(permission: Permission): Promise<AuthContext> {
    return unwrap(authorizePermission(permission));
}

export function requireRole(roles: readonly AppRole[]): Promise<AuthContext> {
    return unwrap(authorizeRole(roles));
}

/**
 * Defense-in-depth helper: asserts that a record's organization matches the
 * actor's active organization. Use before returning or mutating a record
 * that was fetched by id.
 */
export function assertSameOrganization(ctx: AuthContext, recordOrganizationId: string | null): void {
    if (ctx.organizationId && recordOrganizationId && recordOrganizationId !== ctx.organizationId) {
        throw new AuthorizationError('forbidden', 'Cross-organization access denied.');
    }
}

