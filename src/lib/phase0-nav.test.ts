import { describe, expect, it } from 'vitest';

import { PHASE0_HIDDEN_ADMIN_PREFIXES, isPhase0NavVisible } from '@/lib/phase0-nav';

describe('phase0 nav freeze', () => {
    it('hides every frozen section and its sub-routes', () => {
        for (const prefix of PHASE0_HIDDEN_ADMIN_PREFIXES) {
            expect(isPhase0NavVisible(prefix)).toBe(false);
            expect(isPhase0NavVisible(`${prefix}/new`)).toBe(false);
            expect(isPhase0NavVisible(`${prefix}/webhooks`)).toBe(false);
        }
    });

    it('keeps the core destinations visible', () => {
        for (const href of [
            '/admin',
            '/admin/trust',
            '/admin/members',
            '/admin/projects',
            '/admin/financial',
            '/admin/reporting',
            '/admin/impact',
            '/admin/forms',
            '/admin/content',
            '/admin/settings',
        ]) {
            expect(isPhase0NavVisible(href)).toBe(true);
        }
    });

    it('does not hide lookalike routes by prefix collision', () => {
        // startsWith(p + '/') guard: /admin/rbac2 must not match /admin/rbac.
        expect(isPhase0NavVisible('/admin/rbac2')).toBe(true);
    });
});
