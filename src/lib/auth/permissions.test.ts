import { describe, expect, it } from 'vitest';
import {
    ALL_PERMISSIONS,
    ADMIN_PANEL_ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    ROLE_RANK,
    effectiveHasPermission,
    getPermissionExplanation,
    hasRole,
    isAssignmentActive,
    mergeEffectivePermissions,
    roleHasPermission,
} from '@/lib/auth/permissions';

describe('permission registry', () => {
    it('exposes a flat, de-duplicated list of every registered permission', () => {
        expect(ALL_PERMISSIONS.length).toBeGreaterThan(50);
        expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
    });

    it('follows the <module>.<action> naming convention', () => {
        for (const p of ALL_PERMISSIONS) expect(p).toMatch(/^[a-z]+\.[a-z_]+$/);
    });

    it('gives owner and admin the implicit wildcard grant', () => {
        expect(ROLE_PERMISSIONS.owner).toBe('*');
        expect(ROLE_PERMISSIONS.admin).toBe('*');
    });

    it('keeps the admin panel restricted to owner/admin, in rank order', () => {
        expect(ADMIN_PANEL_ROLES).toEqual(['owner', 'admin']);
        expect(ROLE_RANK.owner).toBeGreaterThan(ROLE_RANK.admin);
        expect(ROLE_RANK.manager).toBeGreaterThan(ROLE_RANK.member);
    });
});

describe('roleHasPermission', () => {
    it('grants everything to owner/admin', () => {
        expect(roleHasPermission('owner', PERMISSIONS.content.publish)).toBe(true);
        expect(roleHasPermission('admin', PERMISSIONS.finance.approve)).toBe(true);
    });

    it('lets managers draft but not publish, approve, or touch RBAC', () => {
        expect(roleHasPermission('manager', PERMISSIONS.content.manage)).toBe(true);
        expect(roleHasPermission('manager', PERMISSIONS.content.review)).toBe(true);
        expect(roleHasPermission('manager', PERMISSIONS.content.publish)).toBe(false);
        expect(roleHasPermission('manager', PERMISSIONS.finance.approve)).toBe(false);
        expect(roleHasPermission('manager', PERMISSIONS.rbac.manage)).toBe(false);
    });

    it('keeps the three content capabilities distinct', () => {
        // Drafting, reviewing, and publishing are separate grants: a role can
        // hold any one of them without implying the others.
        const contentPermissions = [
            PERMISSIONS.content.manage,
            PERMISSIONS.content.review,
            PERMISSIONS.content.publish,
        ];
        expect(new Set(contentPermissions).size).toBe(3);
        expect(contentPermissions).toEqual(['content.manage', 'content.review', 'content.publish']);
        // Members hold none of them.
        for (const permission of contentPermissions) {
            expect(roleHasPermission('member', permission)).toBe(false);
        }
    });

    it('fails closed for members and unknown/null roles', () => {
        expect(roleHasPermission('member', PERMISSIONS.donations.read)).toBe(false);
        expect(roleHasPermission('member', PERMISSIONS.notifications.read)).toBe(true);
        expect(roleHasPermission(null, PERMISSIONS.content.read)).toBe(false);
        expect(roleHasPermission(undefined, PERMISSIONS.content.read)).toBe(false);
        expect(roleHasPermission('superuser', PERMISSIONS.content.read)).toBe(false);
    });
});

describe('hasRole', () => {
    it('matches only the listed roles, fail-closed', () => {
        expect(hasRole('admin', ADMIN_PANEL_ROLES)).toBe(true);
        expect(hasRole('manager', ADMIN_PANEL_ROLES)).toBe(false);
        expect(hasRole(null, ADMIN_PANEL_ROLES)).toBe(false);
        expect(hasRole('OWNER', ADMIN_PANEL_ROLES)).toBe(false); // case-sensitive
    });
});

describe('isAssignmentActive', () => {
    it('treats no expiry as active', () => {
        expect(isAssignmentActive({ expires_at: null })).toBe(true);
    });

    it('honours future expiries', () => {
        expect(isAssignmentActive({ expires_at: new Date(Date.now() + 60_000).toISOString() })).toBe(true);
    });

    it('rejects past expiries', () => {
        expect(isAssignmentActive({ expires_at: new Date(Date.now() - 60_000).toISOString() })).toBe(false);
    });
});

describe('mergeEffectivePermissions', () => {
    it('expands the wildcard for owner', () => {
        const eff = mergeEffectivePermissions('owner', [], []);
        expect(eff.size).toBe(ALL_PERMISSIONS.length);
        expect(effectiveHasPermission(eff, PERMISSIONS.rbac.manage)).toBe(true);
    });

    it('applies the static manager grants', () => {
        const eff = mergeEffectivePermissions('manager', [], []);
        expect(effectiveHasPermission(eff, PERMISSIONS.workers.manage)).toBe(true);
        expect(effectiveHasPermission(eff, PERMISSIONS.finance.approve)).toBe(false);
    });

    it('adds custom-role grants only for known, granted, unexpired keys', () => {
        const eff = mergeEffectivePermissions(
            'member',
            [
                {
                    role_id: 'r1',
                    permissions: { 'content.manage': true, 'not.a.permission': true, 'tags.manage': false },
                    expires_at: null,
                },
                {
                    role_id: 'r2',
                    permissions: { 'finance.approve': true },
                    expires_at: new Date(Date.now() - 1_000).toISOString(),
                },
            ],
            [],
        );
        expect(effectiveHasPermission(eff, PERMISSIONS.content.manage)).toBe(true);
        expect(effectiveHasPermission(eff, PERMISSIONS.tags.manage)).toBe(false);
        expect(effectiveHasPermission(eff, PERMISSIONS.finance.approve)).toBe(false); // expired
        // Unknown keys are dropped: member's 6 base grants (Phase 1 added
        // projects.read + beneficiaries.read/manage for field officers)
        // + content.manage only (a leaked 'not.a.permission' would make this 8).
        expect(eff.size).toBe(7);
    });

    it('lets an explicit deny beat base-role and custom grants', () => {
        const eff = mergeEffectivePermissions(
            'manager',
            [{ role_id: 'r1', permissions: { 'finance.approve': true }, expires_at: null }],
            [
                { permission_key: PERMISSIONS.workers.manage, is_granted: false },
                { permission_key: PERMISSIONS.finance.approve, is_granted: false },
            ],
        );
        expect(effectiveHasPermission(eff, PERMISSIONS.finance.approve)).toBe(false);
        expect(effectiveHasPermission(eff, PERMISSIONS.workers.manage)).toBe(false);
    });

    it('lets an explicit grant extend beyond the base role', () => {
        const eff = mergeEffectivePermissions(
            'member',
            [],
            [{ permission_key: PERMISSIONS.donations.read, is_granted: true }],
        );
        expect(effectiveHasPermission(eff, PERMISSIONS.donations.read)).toBe(true);
    });

    it('ignores unknown base roles and unknown overrides', () => {
        const eff = mergeEffectivePermissions('nobody', [], [{ permission_key: 'hacker.escape', is_granted: true }]);
        expect(eff.size).toBe(0);
    });
});

describe('getPermissionExplanation', () => {
    it('lists the roles that would grant a denied permission', () => {
        const ex = getPermissionExplanation('member', PERMISSIONS.finance.approve);
        expect(ex.granted).toBe(false);
        expect(ex.requiredRoles).toEqual(['owner', 'admin']);
        expect(ex.message).toContain('finance.approve');
    });

    it('reports granted permissions', () => {
        const ex = getPermissionExplanation('manager', PERMISSIONS.projects.manage);
        expect(ex.granted).toBe(true);
        expect(ex.message).toContain('Allowed');
    });
});