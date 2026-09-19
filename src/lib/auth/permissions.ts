/**
 * Central permission registry & role model (isomorphic).
 *
 * Safe to import from anywhere: client components, server components,
 * server actions, and middleware. MUST NOT contain server-only imports.
 *
 * Permission naming convention: `<module>.<action>` (e.g. `content.publish`,
 * `finance.approve`, `members.manage`).
 */

export const APP_ROLES = ['owner', 'admin', 'manager', 'member'] as const;
export type AppRole = (typeof APP_ROLES)[number];

/** Relative seniority of each role (higher = more privileged). */
export const ROLE_RANK: Record<AppRole, number> = {
    owner: 40,
    admin: 30,
    manager: 20,
    member: 10,
};

/**
 * Roles allowed to access the Command Center (admin area).
 * Single source of truth for layout guards, middleware, and navigation.
 */
export const ADMIN_PANEL_ROLES: readonly AppRole[] = ['owner', 'admin'];

/**
 * The permission registry. Every Server Action authorization must reference
 * a permission from here -- never a raw role string.
 */
export const PERMISSIONS = {
    audit: { read: 'audit.read', manage: 'audit.manage' },
    settings: { read: 'settings.read', manage: 'settings.manage' },
    members: { read: 'members.read', invite: 'members.invite', manage: 'members.manage' },
    rbac: { read: 'rbac.read', manage: 'rbac.manage' },
    workers: { read: 'workers.read', manage: 'workers.manage' },
    volunteers: { read: 'volunteers.read', manage: 'volunteers.manage', approveHours: 'volunteers.approve_hours' },
    partners: { read: 'partners.read', manage: 'partners.manage' },
    donors: { read: 'donors.read', manage: 'donors.manage' },
    donations: { read: 'donations.read', create: 'donations.create', manage: 'donations.manage' },
    projects: { read: 'projects.read', manage: 'projects.manage' },
    campaigns: { read: 'campaigns.read', manage: 'campaigns.manage' },
    events: { read: 'events.read', manage: 'events.manage' },
    forms: { read: 'forms.read', manage: 'forms.manage' },
    content: { read: 'content.read', manage: 'content.manage', publish: 'content.publish' },
    finance: { read: 'finance.read', manage: 'finance.manage', approve: 'finance.approve' },
    impact: { read: 'impact.read', manage: 'impact.manage' },
    notifications: { read: 'notifications.read', manage: 'notifications.manage' },
    messaging: { read: 'messaging.read', manage: 'messaging.manage' },
    tags: { read: 'tags.read', manage: 'tags.manage' },
    reporting: { read: 'reporting.read', manage: 'reporting.manage' },
    scheduling: { read: 'scheduling.read', manage: 'scheduling.manage' },
    automations: { read: 'automations.read', manage: 'automations.manage' },
    workflows: { read: 'workflows.read', manage: 'workflows.manage' },
    integrations: { read: 'integrations.read', manage: 'integrations.manage' },
    governance: { read: 'governance.read', manage: 'governance.manage' },
} as const;

export type Permission = {
    [M in keyof typeof PERMISSIONS]: (typeof PERMISSIONS)[M][keyof (typeof PERMISSIONS)[M]];
}[keyof typeof PERMISSIONS];

/** Flat list of every registered permission. */
export const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSIONS).flatMap(
    (module) => Object.values(module) as Permission[],
);

/**
 * Role -> permission grants.
 * `'*'` means every registered permission (implicit grant for owner/admin).
 */
export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[] | '*'> = {
    owner: '*',
    admin: '*',
    manager: [
        // Organization & members
        PERMISSIONS.settings.read,
        PERMISSIONS.members.read,
        // People & programs (full operational management)
        PERMISSIONS.workers.read,
        PERMISSIONS.workers.manage,
        PERMISSIONS.volunteers.read,
        PERMISSIONS.volunteers.manage,
        PERMISSIONS.volunteers.approveHours,
        PERMISSIONS.partners.read,
        PERMISSIONS.partners.manage,
        PERMISSIONS.donors.read,
        PERMISSIONS.donations.read,
        PERMISSIONS.donations.create,
        PERMISSIONS.projects.read,
        PERMISSIONS.projects.manage,
        PERMISSIONS.campaigns.read,
        PERMISSIONS.campaigns.manage,
        PERMISSIONS.events.read,
        PERMISSIONS.events.manage,
        PERMISSIONS.forms.read,
        PERMISSIONS.forms.manage,
        PERMISSIONS.impact.read,
        PERMISSIONS.impact.manage,
        // Content (drafting only -- publishing requires content.publish)
        PERMISSIONS.content.read,
        PERMISSIONS.content.manage,
        // Communication
        PERMISSIONS.messaging.read,
        PERMISSIONS.notifications.read,
        PERMISSIONS.tags.read,
        PERMISSIONS.tags.manage,
        // Read-only access to sensitive/administrative modules
        PERMISSIONS.finance.read,
        PERMISSIONS.reporting.read,
        PERMISSIONS.scheduling.read,
        PERMISSIONS.automations.read,
        PERMISSIONS.workflows.read,
        PERMISSIONS.governance.read,
    ],
    member: [
        PERMISSIONS.notifications.read,
        PERMISSIONS.messaging.read,
        PERMISSIONS.events.read,
    ],
};

/**
 * Resolving custom role grants + per-user overrides.
 *
 * Two layers, applied in this order:
 *   1. Custom role grants — `custom_roles.permissions` for every non-expired
 *      `role_assignments` row (user × org). Roles are stored as
 *      `{ "content.manage": true }` maps; unknown keys are ignored so a
 *      stale role can never escalate.
 *   2. Permission overrides — `permission_overrides` rows for the user, which
 *      explicitly grant (`is_granted = true`) or deny (`false`) one
 *      permission. Deny wins: it removes the permission even when the base
 *      role (step 0) or a custom role grants it.
 *
 * Read path mirrors the enforcement row types exactly (shared helper below)
 * so the UI preview and the TS guard cannot drift apart: the only
 * difference is that `authorizePermission` fails closed (deny on any
 * read error) while `getEffectivePermissions` surfaces what it could load.
 */

export interface CustomRoleGrantRow {
    role_id: string;
    permissions: Record<string, boolean> | null;
    expires_at: string | null;
}

export interface PermissionOverrideRow {
    permission_key: string;
    is_granted: boolean;
}

/** Permission keys we know about — anything else in a role blob is ignored. */
const KNOWN_PERMISSIONS = new Set<string>(ALL_PERMISSIONS);

/** True when the assignment row is active right now (no expiry or future expiry). */
export function isAssignmentActive(row: { expires_at: string | null }): boolean {
    if (!row.expires_at) return true;
    return new Date(row.expires_at).getTime() > Date.now();
}

/**
 * Pure merge: base-role grants ∪ active custom-role grants, minus explicit
 * denies, plus explicit grants. Used by both the guard and the UI preview.
 */
export function mergeEffectivePermissions(
    baseRole: AppRole | string | null | undefined,
    customGrants: CustomRoleGrantRow[],
    overrides: PermissionOverrideRow[],
): Set<Permission> {
    const effective = new Set<Permission>();

    // Layer 0 — static base role grants (fail-closed for unknown roles).
    if (baseRole && APP_ROLES.includes(baseRole as AppRole)) {
        const grants = ROLE_PERMISSIONS[baseRole as AppRole];
        if (grants === '*') {
            for (const p of ALL_PERMISSIONS) effective.add(p);
        } else {
            for (const p of grants) effective.add(p);
        }
    }

    // Layer 1 — custom role grants (active assignments only, known keys only).
    for (const row of customGrants) {
        if (!isAssignmentActive(row)) continue;
        const perms = row.permissions;
        if (!perms || typeof perms !== 'object') continue;
        for (const [key, granted] of Object.entries(perms)) {
            if (!granted) continue;
            if (KNOWN_PERMISSIONS.has(key)) effective.add(key as Permission);
        }
    }

    // Layer 2 — explicit per-user overrides (deny wins over every grant).
    for (const override of overrides) {
        if (!KNOWN_PERMISSIONS.has(override.permission_key)) continue;
        if (override.is_granted) effective.add(override.permission_key as Permission);
        else effective.delete(override.permission_key as Permission);
    }

    return effective;
}
/**
 * Whether a role grants a permission. Unknown/null roles are always denied
 * (fail-closed).
 *
 * NOTE: this is the *static* base-role check only. Server-side enforcement
 * must use `authorizePermission()` (guards.ts), which additionally resolves
 * custom role assignments + per-user overrides. Use this helper for UI
 * gating (sidebar/nav visibility) where failing open to a hidden link is
 * harmless because the action itself re-checks.
 */
export function roleHasPermission(
    role: AppRole | string | null | undefined,
    permission: Permission,
): boolean {
    if (!role) return false;
    if (!APP_ROLES.includes(role as AppRole)) return false;
    const grants = ROLE_PERMISSIONS[role as AppRole];
    if (grants === '*') return true;
    return (grants as readonly string[]).includes(permission);
}

/** Whether a role is one of the given roles (fail-closed for unknown roles). */
export function hasRole(
    role: AppRole | string | null | undefined,
    roles: readonly AppRole[],
): boolean {
    if (!role) return false;
    return roles.includes(role as AppRole);
}

/** Whether an effective permission set includes a permission. */
export function effectiveHasPermission(
    effective: ReadonlySet<Permission> | ReadonlySet<string>,
    permission: Permission,
): boolean {
    return (effective as ReadonlySet<string>).has(permission);
}

export interface PermissionExplanation {
    permission: Permission;
    granted: boolean;
    /** Every role that would grant this permission. */
    requiredRoles: readonly AppRole[];
    /** Human-readable explanation for UI ("Why can't I do this?"). */
    message: string;
}

/**
 * Explains whether a role has a permission and, if not, which roles would
 * grant it. Used by guards to return meaningful denial messages and by the
 * UI for permission inspection.
 */
export function getPermissionExplanation(
    role: AppRole | string | null | undefined,
    permission: Permission,
): PermissionExplanation {
    const requiredRoles = APP_ROLES.filter((r) => roleHasPermission(r, permission));
    const granted = roleHasPermission(role, permission);

    return {
        permission,
        granted,
        requiredRoles,
        message: granted
            ? `Allowed: your role "${role ?? 'unknown'}" includes "${permission}".`
            : `Your role "${role ?? 'unknown'}" does not include "${permission}". Required role: ${requiredRoles.join(' or ')}.`,
    };
}

