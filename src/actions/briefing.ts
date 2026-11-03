'use server';

import { authorizeOrganization } from '@/lib/auth/guards';
import { PERMISSIONS, type Permission } from '@/lib/auth/permissions';

/**
 * Morning briefing (ADR-0001, Slice C).
 *
 * Returns the "needs your attention" queue for the *caller*, derived from their
 * EFFECTIVE permissions (base role + custom-role grants + overrides), not their
 * role string. That makes the briefing adapt for free to owner/admin (executive
 * director), manager, and preset roles like finance_reviewer — and degrade to a
 * personal inbox for a plain member.
 *
 * Every count is a `head: true` query through the RLS-scoped client, so a caller
 * who lacks the module permission gets nothing even if the gate above were wrong.
 */

export type BriefingTone = 'danger' | 'warning' | 'info';

export type BriefingItemId =
    | 'failed_automations'
    | 'pending_workflows'
    | 'unread_notifications'
    | 'pending_access_requests'
    | 'expenses_approval'
    | 'field_reports_review'
    | 'paused_automations';

export interface BriefingItem {
    id: BriefingItemId;
    count: number;
    href: string;
    tone: BriefingTone;
}

export interface Briefing {
    name: string | null;
    role: string;
    items: BriefingItem[];
}

export async function getBriefing(): Promise<{ data: Briefing | null; error: string | null }> {
    const auth = await authorizeOrganization();
    if (!auth.ok) return { data: null, error: auth.error };

    const client = auth.context.supabase;
    const orgId = auth.organizationId;
    const can = (permission: Permission) => auth.effective.has(permission);

    async function countRows(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
        const { count, error } = await query;
        if (error) return 0;
        return count ?? 0;
    }

    const [unread, failedAutomations, pausedAutomations, pendingWorkflows, pendingAccessRequests, expensesApproval, fieldReports] =
        await Promise.all([
            // Own notifications — available to every member.
            countRows(
                client.from('notifications').select('id', { count: 'exact', head: true })
                    .eq('recipient_id', auth.userId).eq('status', 'pending'),
            ),
            can(PERMISSIONS.automations.read)
                ? countRows(
                    client.from('automation_executions').select('id', { count: 'exact', head: true })
                        .eq('organization_id', orgId).eq('status', 'failure'),
                )
                : Promise.resolve(0),
            // Installed-but-disabled rules (e.g. a bundle awaiting review).
            can(PERMISSIONS.automations.read)
                ? countRows(
                    client.from('automation_rules').select('id', { count: 'exact', head: true })
                        .eq('organization_id', orgId).eq('is_enabled', false),
                )
                : Promise.resolve(0),
            can(PERMISSIONS.workflows.read)
                ? countRows(
                    client.from('workflow_instances').select('id', { count: 'exact', head: true })
                        .eq('organization_id', orgId).in('status', ['pending', 'running', 'waiting']),
                )
                : Promise.resolve(0),
            can(PERMISSIONS.members.manage)
                ? countRows(
                    client.from('role_requests').select('id', { count: 'exact', head: true })
                        .eq('organization_id', orgId).eq('status', 'pending'),
                )
                : Promise.resolve(0),
            can(PERMISSIONS.finance.approve)
                ? countRows(
                    client.from('expenses').select('id', { count: 'exact', head: true })
                        .eq('organization_id', orgId).in('status', ['pending', 'approved_first']),
                )
                : Promise.resolve(0),
            can(PERMISSIONS.impact.manage)
                ? countRows(
                    client.from('field_reports').select('id', { count: 'exact', head: true })
                        .eq('organization_id', orgId).in('validation_state', ['pending_review', 'quarantined']),
                )
                : Promise.resolve(0),
        ]);

    const items: BriefingItem[] = [];
    if (unread > 0) items.push({ id: 'unread_notifications', count: unread, href: '/dashboard/settings', tone: 'info' });
    if (failedAutomations > 0) items.push({ id: 'failed_automations', count: failedAutomations, href: '/admin/automations', tone: 'danger' });
    if (pendingWorkflows > 0) items.push({ id: 'pending_workflows', count: pendingWorkflows, href: '/admin/workflows', tone: 'warning' });
    if (pendingAccessRequests > 0) items.push({ id: 'pending_access_requests', count: pendingAccessRequests, href: '/admin/settings', tone: 'warning' });
    if (expensesApproval > 0) items.push({ id: 'expenses_approval', count: expensesApproval, href: '/admin/financial', tone: 'warning' });
    if (fieldReports > 0) items.push({ id: 'field_reports_review', count: fieldReports, href: '/admin/impact', tone: 'warning' });
    if (pausedAutomations > 0) items.push({ id: 'paused_automations', count: pausedAutomations, href: '/admin/automations', tone: 'info' });

    return { data: { name: auth.context.name, role: auth.role, items }, error: null };
}
