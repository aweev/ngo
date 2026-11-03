/**
 * Starter presets — ADR-0001, Slice B.
 *
 * One isomorphic source of truth for the two "templates" catalogs surfaced at
 * `/admin/templates`:
 *   - ROLE_PRESETS       — permission bundles applied to a new custom role.
 *   - AUTOMATION_BUNDLES — event rules, optionally with a workflow chain, that
 *                          install as DISABLED automations for review.
 *
 * Structure + display data only. Names/descriptions are plain "seed" strings
 * (the same convention as the DB `automation_templates` seed), so they are NOT
 * UI copy and are not run through next-intl. The server actions resolve the
 * structural parts here, so a tampered client can never inject an arbitrary
 * permission set or action payload.
 */
import { PERMISSIONS as P, type Permission } from '@/lib/auth/permissions';
import type { AutomationAction, AutomationCondition } from '@/types/domain/automations';
import type { WorkflowStep } from '@/types/domain/workflows';

export interface RolePreset {
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
}

export interface AutomationBundle {
    id: string;
    name: string;
    description: string;
    /** Domain event that triggers the rule (ADR-0001 event spine). */
    event: string;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    /** Optional follow-up chain: a workflow definition is created and wired in. */
    workflow?: {
        slug: string;
        name: string;
        description: string;
        steps: Omit<WorkflowStep, 'id'>[];
    };
}

export const ROLE_PRESETS: RolePreset[] = [
    {
        id: 'finance_reviewer',
        name: 'Finance Reviewer',
        description: 'Reviews donations, expenses, and reports; can approve financial records.',
        permissions: [P.finance.read, P.finance.approve, P.donations.read, P.reporting.read, P.settings.read],
    },
    {
        id: 'project_coordinator',
        name: 'Project Coordinator',
        description: 'Runs projects, campaigns, events, and forms; manages beneficiaries and impact.',
        permissions: [
            P.projects.read, P.projects.manage, P.campaigns.read, P.campaigns.manage,
            P.events.read, P.events.manage, P.forms.read, P.forms.manage,
            P.impact.read, P.impact.manage,
            P.workers.read, P.volunteers.read, P.beneficiaries.read, P.beneficiaries.manage,
        ],
    },
    {
        id: 'content_editor',
        name: 'Content Editor',
        description: 'Drafts and reviews pages and messages; publishing stays gated.',
        permissions: [
            P.content.read, P.content.manage, P.content.review,
            P.messaging.read, P.messaging.manage, P.notifications.read, P.tags.read,
        ],
    },
    {
        id: 'volunteer_manager',
        name: 'Volunteer Manager',
        description: 'Onboards volunteers and approves logged hours.',
        permissions: [
            P.volunteers.read, P.volunteers.manage, P.volunteers.approveHours,
            P.workers.read, P.events.read, P.beneficiaries.read,
        ],
    },
    {
        id: 'donor_relations',
        name: 'Donor Relations',
        description: 'Manages donors and partners, records donations, and reads reports.',
        permissions: [
            P.donors.read, P.donors.manage, P.donations.read, P.donations.create,
            P.partners.read, P.messaging.read, P.reporting.read,
        ],
    },
    {
        id: 'field_supervisor',
        name: 'Field Supervisor',
        description: 'Supervises field registration and beneficiary records.',
        permissions: [
            P.beneficiaries.read, P.beneficiaries.manage, P.projects.read,
            P.impact.read, P.workers.read, P.volunteers.read,
        ],
    },
];

export const AUTOMATION_BUNDLES: AutomationBundle[] = [
    {
        id: 'major_donor_stewardship',
        name: 'Major donor stewardship',
        description: 'When a gift over 1,000 lands, alert the executive director and start a personal follow-up chain.',
        event: 'donation.completed',
        conditions: [{ field: 'amount', operator: 'gt', value: 1000, logic: 'and' }],
        actions: [
            {
                type: 'send_notification',
                config: {
                    channel: 'in_app',
                    recipient_role: 'owner',
                    subject: 'Large gift received',
                    body: 'A donation of {{amount}} {{currency}} from {{donor_name}} needs a personal follow-up.',
                },
            },
            { type: 'start_workflow', config: {} },
        ],
        workflow: {
            slug: 'major-donor-followup',
            name: 'Major donor follow-up',
            description: 'Personal stewardship chain for a large gift.',
            steps: [
                { name: 'Personal thank-you call', type: 'task', config: {}, assignee_type: 'role', assignee_id: 'owner', step_index: 0 },
                { name: 'Send an impact update', type: 'notification', config: {}, step_index: 1 },
                { name: '30-day check-in', type: 'task', config: {}, due_in_hours: 720, step_index: 2 },
            ],
        },
    },
    {
        id: 'volunteer_welcome',
        name: 'Volunteer welcome',
        description: 'When a volunteer registers, notify the coordinator to assign a buddy and a first shift.',
        event: 'volunteer.created',
        conditions: [],
        actions: [
            {
                type: 'send_notification',
                config: {
                    channel: 'in_app',
                    recipient_role: 'manager',
                    subject: 'New volunteer registered',
                    body: '{{name}} just signed up. Assign a buddy and a first shift.',
                },
            },
        ],
    },
    {
        id: 'publish_announcement',
        name: 'Publish announcement',
        description: 'When a page is published, notify administrators to review and share it.',
        event: 'content.page_locale_published',
        conditions: [],
        actions: [
            {
                type: 'send_notification',
                config: {
                    channel: 'in_app',
                    recipient_role: 'admin',
                    subject: 'Page published',
                    body: 'A page was published. Review it live and share it with your channels.',
                },
            },
        ],
    },
];

export function findRolePreset(id: string): RolePreset | undefined {
    return ROLE_PRESETS.find((preset) => preset.id === id);
}

export function findAutomationBundle(id: string): AutomationBundle | undefined {
    return AUTOMATION_BUNDLES.find((bundle) => bundle.id === id);
}

