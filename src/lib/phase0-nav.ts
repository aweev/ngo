/**
 * Phase 0 bloat freeze (item 0.3.1).
 *
 * These admin sections are hidden from navigation until their Phase 4 fate
 * (merge or cut) is executed. Routes and server actions stay live for one
 * release so bookmarked links and the static CTA/i18n verifiers keep passing
 * — hiding is a nav filter, NOT a route deletion.
 *
 * Escape hatch for operators: set NEXT_PUBLIC_PHASE0_FULL_NAV=true to show
 * everything (e.g. while exporting data out of a hidden module).
 */
export const PHASE0_HIDDEN_ADMIN_PREFIXES = [
    '/admin/messaging',
    '/admin/automations',
    '/admin/workflows',
    '/admin/integrations',
    '/admin/rbac',
    '/admin/governance',
    '/admin/hr',
    '/admin/reviews',
    '/admin/tags',
] as const;

export function isPhase0NavVisible(href: string): boolean {
    if (process.env.NEXT_PUBLIC_PHASE0_FULL_NAV === 'true') return true;
    const path = href.split('?')[0];
    return !PHASE0_HIDDEN_ADMIN_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
}
