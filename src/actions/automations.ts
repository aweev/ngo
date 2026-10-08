'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type {
    AutomationRule,
    AutomationRuleInsert,
    AutomationRuleUpdate,
    AutomationExecution,
} from '@/types/domain/automations';

/** Get all automation rules for the active organization. */
export async function getAutomationRules(): Promise<{ data: AutomationRule[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.automations.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('automation_rules')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load automation rules. Please try again.' };
    return { data, error: null };
}

/** Get a single automation rule (scoped to the active organization). */
export async function getAutomationRule(id: string): Promise<{ data: AutomationRule | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.automations.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('automation_rules')
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Automation rule not found.' };
    return { data, error: null };
}

/** Create an automation rule (created disabled — validate before enabling). */
export async function createAutomationRule(input: Omit<AutomationRuleInsert, 'organization_id'>): Promise<{ data: AutomationRule | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.automations.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('automation_rules')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
            is_enabled: false,
        })
        .select()
        .single();

    if (error) {
        console.error('[createAutomationRule]', error.message);
        return { data: null, error: 'Unable to create automation rule. Please check the provided data.' };
    }

    revalidatePath('/admin/automations');
    return { data, error: null };
}

/** Update an automation rule (organization-scoped, cannot change organization). */
export async function updateAutomationRule(id: string, input: AutomationRuleUpdate): Promise<{ data: AutomationRule | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.automations.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of an automation rule.' };
    }

    const { data, error } = await auth.context.supabase
        .from('automation_rules')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateAutomationRule]', error.message);
        return { data: null, error: 'Unable to update automation rule. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Automation rule not found.' };

    revalidatePath('/admin/automations');
    return { data, error: null };
}

/** Enable or disable an automation rule. */
export async function toggleAutomationRule(id: string, is_enabled: boolean): Promise<{ data: AutomationRule | null; error: string | null }> {
    return updateAutomationRule(id, { is_enabled });
}

/** Delete an automation rule (organization-scoped). */
export async function deleteAutomationRule(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.automations.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('automation_rules')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteAutomationRule]', error.message);
        return { error: 'Unable to delete automation rule. Please try again.' };
    }
    if (!data) return { error: 'Automation rule not found.' };

    revalidatePath('/admin/automations');
    return { error: null };
}

export interface AutomationTemplate {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    trigger_type: string;
    template_config: {
        trigger_config?: Record<string, unknown>;
        conditions?: Record<string, unknown>[];
        actions?: Record<string, unknown>[];
    };
    is_system: boolean;
}

/** System + org automation templates (starters for new rules). */
export async function getAutomationTemplates(): Promise<{ data: AutomationTemplate[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.automations.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('automation_templates')
        .select('id, name, description, category, trigger_type, template_config, is_system')
        .or(`organization_id.eq.${auth.organizationId},is_system.eq.true`)
        .order('name', { ascending: true });

    if (error) return { data: null, error: 'Unable to load automation templates. Please try again.' };
    return { data: data as AutomationTemplate[], error: null };
}

/**
 * Instantiate a template into a disabled rule for review.
 * Rules always start disabled — enabling is an explicit second step.
 */
export async function instantiateAutomationTemplate(
    templateId: string,
    name?: string,
): Promise<{ data: AutomationRule | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.automations.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    // RLS already scopes reads (own org + system rows); re-check ownership
    // in JS so a forged id from another org fails closed here too.
    const { data: scoped } = await auth.context.supabase
        .from('automation_templates')
        .select('name, description, trigger_type, template_config, organization_id, is_system')
        .eq('id', templateId)
        .maybeSingle();
    const t = scoped as (AutomationTemplate & { organization_id: string | null }) | null;
    if (!t || (t.organization_id !== null && !t.is_system && t.organization_id !== auth.organizationId)) {
        return { data: null, error: 'Template not found.' };
    }

    const cfg = (t.template_config ?? {}) as AutomationTemplate['template_config'];
    return createAutomationRule({
        name: name?.trim() || `${t.name} (copy)`,
        description: t.description,
        is_enabled: false,
        trigger_type: t.trigger_type as AutomationRule['trigger_type'],
        trigger_config: (cfg.trigger_config ?? {}) as Record<string, unknown>,
        conditions: (cfg.conditions ?? []) as unknown as AutomationRule['conditions'],
        actions: (cfg.actions ?? []) as unknown as AutomationRule['actions'],
        created_by: auth.context.userId,
    });
}

/** Get automation execution history (organization-scoped, optionally per rule). */
export async function getAutomationExecutions(ruleId?: string): Promise<{ data: AutomationExecution[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.automations.read);
    if (!auth.ok) return { data: null, error: auth.error };

    let query = auth.context.supabase
        .from('automation_executions')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (ruleId) query = query.eq('rule_id', ruleId);

    const { data, error } = await query;
    if (error) return { data: null, error: 'Unable to load automation executions. Please try again.' };
    return { data, error: null };
}

