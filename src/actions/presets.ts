'use server';

import { randomBytes, randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { findAutomationBundle, findRolePreset } from '@/lib/presets';
import type { AutomationAction } from '@/types/domain/automations';
import type { CustomRole } from '@/types/domain/rbac';
import type { WorkflowStep } from '@/types/domain/workflows';

/**
 * Starter-template actions (ADR-0001, Slice B).
 *
 * Both actions resolve the *structure* from `src/lib/presets.ts` server-side and
 * take only an id from the client, so a tampered caller cannot inject an
 * arbitrary permission set, condition, or action payload.
 */

function slugify(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'preset';
}

const roleSchema = z.object({ presetId: z.string().min(1).max(60) });

/** Create a custom role pre-loaded with a preset's permission bundle. */
export async function createRoleFromPreset(
    input: unknown,
): Promise<{ data: CustomRole | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.rbac.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const parsed = roleSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid role preset.' };
    const preset = findRolePreset(parsed.data.presetId);
    if (!preset) return { data: null, error: 'Unknown role preset.' };

    const permissions: Record<string, boolean> = {};
    for (const permission of preset.permissions) permissions[permission] = true;

    const { data, error } = await auth.context.supabase
        .from('custom_roles')
        .insert({
            organization_id: auth.organizationId,
            name: preset.name,
            slug: `${slugify(preset.id)}-${randomBytes(2).toString('hex')}`,
            description: preset.description,
            permissions,
            is_system: false,
        })
        .select()
        .single();

    if (error) {
        console.error('[createRoleFromPreset]', error.message);
        return { data: null, error: 'Unable to create the role from this preset.' };
    }

    revalidatePath('/admin/rbac');
    revalidatePath('/admin/templates');
    return { data: data as CustomRole, error: null };
}

const bundleSchema = z.object({
    bundleId: z.string().min(1).max(60),
    /** When true, install the rule ENABLED and activate its workflow chain. */
    activate: z.boolean().optional(),
});

/** Read-only preview of a bundle so an admin can review it before installing. */
export interface AutomationBundlePreview {
    name: string;
    description: string;
    event: string;
    conditions: { field: string; operator: string; value: string | number }[];
    actions: { type: AutomationAction['type']; recipient: string | null; channel: string | null }[];
    workflow: { name: string; steps: { name: string; type: string }[] } | null;
}

/**
 * Resolve a bundle's structure for the "review before installing" dialog. Reads
 * only — nothing is written — and the structure comes from `src/lib/presets.ts`,
 * so a tampered client never supplies permissions, conditions, or action bodies.
 */
export async function previewAutomationBundle(
    input: unknown,
): Promise<{ data: AutomationBundlePreview | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.automations.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const parsed = bundleSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid automation bundle.' };
    const bundle = findAutomationBundle(parsed.data.bundleId);
    if (!bundle) return { data: null, error: 'Unknown automation bundle.' };

    return {
        data: {
            name: bundle.name,
            description: bundle.description,
            event: bundle.event,
            conditions: bundle.conditions.map((condition) => ({
                field: condition.field,
                operator: condition.operator,
                value: typeof condition.value === 'number' ? condition.value : String(condition.value ?? ''),
            })),
            actions: bundle.actions.map((action) => ({
                type: action.type,
                recipient: typeof action.config.recipient_role === 'string' ? action.config.recipient_role : null,
                channel: typeof action.config.channel === 'string' ? action.config.channel : null,
            })),
            workflow: bundle.workflow
                ? {
                    name: bundle.workflow.name,
                    steps: bundle.workflow.steps.map((step) => ({ name: step.name, type: step.type })),
                }
                : null,
        },
        error: null,
    };
}

/**
 * Install an automation bundle. By default the rule lands DISABLED for review;
 * pass `activate: true` to install it enabled and activate its workflow chain
 * (an explicit, admin-initiated step). When the bundle declares a workflow, the
 * definition is created first and its id is wired into the rule's
 * `start_workflow` action.
 */
export async function applyAutomationBundle(
    input: unknown,
): Promise<{ ruleId: string | null; workflowId: string | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.automations.manage);
    if (!auth.ok) return { ruleId: null, workflowId: null, error: auth.error };

    const parsed = bundleSchema.safeParse(input);
    if (!parsed.success) return { ruleId: null, workflowId: null, error: 'Invalid automation bundle.' };
    const bundle = findAutomationBundle(parsed.data.bundleId);
    if (!bundle) return { ruleId: null, workflowId: null, error: 'Unknown automation bundle.' };

    const activated = parsed.data.activate === true;

    let workflowId: string | null = null;
    if (bundle.workflow) {
        const wfAuth = await authorizePermission(PERMISSIONS.workflows.manage);
        if (!wfAuth.ok) return { ruleId: null, workflowId: null, error: wfAuth.error };

        const steps: WorkflowStep[] = bundle.workflow.steps.map((step) => ({ ...step, id: randomUUID() }));
        const { data: workflow, error: wfError } = await auth.context.supabase
            .from('workflow_definitions')
            .insert({
                organization_id: auth.organizationId,
                name: bundle.workflow.name,
                description: bundle.workflow.description,
                slug: `${bundle.workflow.slug}-${randomBytes(2).toString('hex')}`,
                status: activated ? 'active' : 'draft',
                steps,
                trigger_config: { event: bundle.event },
                created_by: auth.userId,
            })
            .select('id')
            .single();
        if (wfError) {
            console.error('[applyAutomationBundle:workflow]', wfError.message);
            return { ruleId: null, workflowId: null, error: 'Unable to create the workflow chain.' };
        }
        workflowId = (workflow as { id: string }).id;
    }

    const actions: AutomationAction[] = bundle.actions.map((action) =>
        action.type === 'start_workflow' && workflowId
            ? { ...action, config: { ...action.config, workflow_definition_id: workflowId } }
            : { ...action },
    );

    const { data: rule, error: ruleError } = await auth.context.supabase
        .from('automation_rules')
        .insert({
            organization_id: auth.organizationId,
            name: bundle.name,
            description: bundle.description,
            is_enabled: activated,
            trigger_type: 'event',
            trigger_config: { event: bundle.event },
            conditions: [...bundle.conditions],
            actions,
            created_by: auth.userId,
        })
        .select('id')
        .single();
    if (ruleError) {
        console.error('[applyAutomationBundle:rule]', ruleError.message);
        return { ruleId: null, workflowId, error: 'Unable to create the automation rule.' };
    }

    revalidatePath('/admin/automations');
    revalidatePath('/admin/templates');
    return { ruleId: (rule as { id: string }).id, workflowId, error: null };
}
