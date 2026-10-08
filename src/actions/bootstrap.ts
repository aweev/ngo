'use server';

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ACTIVE_ORG_COOKIE, authorizeRole, authorizeUser } from '@/lib/auth/guards';
import type { AppRole } from '@/lib/auth/permissions';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

export interface BootstrapStatus {
    /** Whether the caller already belongs to an organization. */
    hasMembership: boolean;
    role: AppRole;
    organizationName: string | null;
    /** True when at least one organization exists system-wide. */
    organizationExists: boolean;
}

/**
 * First-run / pending-access status for the setup wizard.
 * Any signed-in user may ask (it reveals nothing but counts).
 */
export async function getBootstrapStatus(): Promise<{ data: BootstrapStatus | null; error: string | null }> {
    const auth = await authorizeUser();
    if (!auth.ok) return { data: null, error: auth.error };

    const admin = createSupabaseAdminClient();
    const { count, error } = await admin
        .from('organizations')
        .select('id', { count: 'exact', head: true });
    if (error) return { data: null, error: 'Unable to check the workspace status.' };

    return {
        data: {
            hasMembership: auth.context.hasOrganization,
            role: auth.context.role,
            organizationName: auth.context.organizationName,
            organizationExists: (count ?? 0) > 0,
        },
        error: null,
    };
}

const bootstrapSchema = z.object({
    name: z.string().trim().min(2).max(120),
});

/**
 * One-shot first-run bootstrap: creates the first organization and makes the
 * caller its owner. Refuses when any organization already exists, so it can
 * never hijack or duplicate a live workspace. Uses the service-role client
 * because at this point RLS cannot see any membership yet — the zero-org
 * gate above is the authorization boundary.
 */
export async function bootstrapOrganization(
    input: unknown,
): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizeUser();
    if (!auth.ok) return { success: false, error: auth.error };
    if (auth.context.hasOrganization) {
        return { success: false, error: 'Your account is already linked to an organization.' };
    }

    const parsed = bootstrapSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Give your organization a name (2–120 characters).' };

    const admin = createSupabaseAdminClient();
    const { count } = await admin.from('organizations').select('id', { count: 'exact', head: true });
    if ((count ?? 0) > 0) {
        return { success: false, error: 'This workspace is already set up. Ask an administrator for an invite.' };
    }

    const name = parsed.data.name;
    const slug = `${name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'org'}-${randomBytes(3).toString('hex')}`;

    const { data: org, error: orgError } = await admin
        .from('organizations')
        .insert({ name, slug })
        .select('id')
        .single();
    if (orgError || !org) return { success: false, error: 'Unable to create the organization. Please try again.' };

    const { error: memberError } = await admin.from('organization_members').insert({
        organization_id: (org as { id: string }).id,
        user_id: auth.context.userId,
        role: 'owner',
    });
    if (memberError) {
        await admin.from('organizations').delete().eq('id', (org as { id: string }).id);
        return { success: false, error: 'Unable to link your account. Please try again.' };
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, (org as { id: string }).id, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath('/', 'layout');
    return { success: true, error: null };
}

// ===========================================================================
// Guided setup — REAL template seeding (audit Wave 0 item 4, Wave 2 small team)
//
// The previous onboarding wizard claimed it "auto-seeded default campaigns &
// impact metrics" while only awaiting an 800 ms timer. This action actually
// creates the starter items, as DRAFTS (nothing is published automatically),
// exactly once (idempotent by slug), and reports what really happened.
// ===========================================================================

export type WorkspaceTemplateId = 'disaster_relief' | 'animal_shelter' | 'food_bank' | 'healthcare';

export interface SeededItem {
    kind: 'campaign' | 'impact_metric' | 'volunteer_role' | 'notification_template';
    name: string;
}

export interface SeedWorkspaceResult {
    success: boolean;
    error: string | null;
    /** True when this template was already applied (slug marker exists). */
    alreadySeeded: boolean;
    /** Everything that now exists, including items created before an error. */
    created: SeededItem[];
}

/** Server-side template data (defaults for new database rows, not UI copy). */
const WORKSPACE_TEMPLATES: Record<
    WorkspaceTemplateId,
    {
        campaign: { name: string; slug: string; description: string; goalAmount: number };
        metric: { name: string; slug: string; unit: string; description: string };
        volunteerRole: { title: string; slug: string; description: string; category: string };
        notification: { name: string; slug: string; subject: string; body: string };
    }
> = {
    disaster_relief: {
        campaign: {
            name: 'Emergency Flood Relief',
            slug: 'emergency-flood-relief',
            description: 'Rapid-response fund for emergency field operations.',
            goalAmount: 25000,
        },
        metric: {
            name: 'Clean Water Kits Distributed',
            slug: 'clean-water-kits-distributed',
            unit: 'kits',
            description: 'Water filtration kits distributed to affected households.',
        },
        volunteerRole: {
            title: 'Field Response Volunteer',
            slug: 'field-response-volunteer',
            description: 'Support on-site relief logistics and distribution.',
            category: 'Field Operations',
        },
        notification: {
            name: 'Field shift reminder',
            slug: 'field-shift-reminder',
            subject: 'Your field shift is coming up',
            body: 'Hello {{name}}, your field shift starts at {{time}}. Please confirm your attendance.',
        },
    },
    animal_shelter: {
        campaign: {
            name: 'Winter Shelter Upgrade Fund',
            slug: 'winter-shelter-upgrade-fund',
            description: 'Funding kennel and shelter upgrades before winter.',
            goalAmount: 15000,
        },
        metric: {
            name: 'Rescued Animals Rehomed',
            slug: 'rescued-animals-rehomed',
            unit: 'animals',
            description: 'Rescued animals placed into permanent homes.',
        },
        volunteerRole: {
            title: 'Animal Care Volunteer',
            slug: 'animal-care-volunteer',
            description: 'Daily care, walking, and enrichment for shelter animals.',
            category: 'Animal Care',
        },
        notification: {
            name: 'Volunteer shift reminder',
            slug: 'volunteer-shift-reminder',
            subject: 'Your shelter shift is coming up',
            body: 'Hello {{name}}, your shelter shift starts at {{time}}. Please confirm your attendance.',
        },
    },
    food_bank: {
        campaign: {
            name: 'Warm Meals for Families',
            slug: 'warm-meals-for-families',
            description: 'Funding daily meal distribution for families in need.',
            goalAmount: 10000,
        },
        metric: {
            name: 'Nutritious Meals Served',
            slug: 'nutritious-meals-served',
            unit: 'meals',
            description: 'Meals served through the community kitchen.',
        },
        volunteerRole: {
            title: 'Kitchen Volunteer',
            slug: 'kitchen-volunteer',
            description: 'Meal prep, service, and distribution support.',
            category: 'Food Services',
        },
        notification: {
            name: 'Kitchen shift reminder',
            slug: 'kitchen-shift-reminder',
            subject: 'Your kitchen shift is coming up',
            body: 'Hello {{name}}, your kitchen shift starts at {{time}}. Please confirm your attendance.',
        },
    },
    healthcare: {
        campaign: {
            name: 'Mobile Vaccine Drive',
            slug: 'mobile-vaccine-drive',
            description: 'Funding mobile clinic outreach and vaccination logistics.',
            goalAmount: 40000,
        },
        metric: {
            name: 'Patients Treated in Field',
            slug: 'patients-treated-in-field',
            unit: 'visits',
            description: 'Patient visits completed by the mobile clinic.',
        },
        volunteerRole: {
            title: 'Clinic Support Volunteer',
            slug: 'clinic-support-volunteer',
            description: 'Registration, logistics, and patient flow support at mobile clinics.',
            category: 'Healthcare',
        },
        notification: {
            name: 'Clinic shift reminder',
            slug: 'clinic-shift-reminder',
            subject: 'Your clinic shift is coming up',
            body: 'Hello {{name}}, your clinic shift starts at {{time}}. Please confirm your attendance.',
        },
    },
};

/**
 * Creates the starter workspace items for one archetype.
 * Everything is created as a DRAFT so the team reviews before publishing,
 * and the campaign slug acts as the idempotency marker.
 */
export async function seedWorkspaceTemplate(archetypeId: string): Promise<SeedWorkspaceResult> {
    const auth = await authorizeRole(['owner', 'admin']);
    if (!auth.ok) {
        return { success: false, error: auth.error, alreadySeeded: false, created: [] };
    }

    const template = WORKSPACE_TEMPLATES[archetypeId as WorkspaceTemplateId];
    if (!template) {
        return { success: false, error: 'Unknown setup template.', alreadySeeded: false, created: [] };
    }

    const supabase = auth.context.supabase;
    const orgId = auth.organizationId;
    const userId = auth.userId;
    const created: SeededItem[] = [];

    // Idempotency: the campaign slug marks this template as applied.
    const { data: existing } = await supabase
        .from('campaigns')
        .select('id')
        .eq('organization_id', orgId)
        .eq('slug', template.campaign.slug)
        .maybeSingle();
    if (existing) {
        return { success: true, error: null, alreadySeeded: true, created: [] };
    }

    const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
            organization_id: orgId,
            name: template.campaign.name,
            slug: template.campaign.slug,
            description: template.campaign.description,
            goal_amount: template.campaign.goalAmount,
            currency: 'EUR',
            status: 'draft',
        })
        .select('name')
        .single();
    if (campaignError) {
        return { success: false, error: campaignError.message, alreadySeeded: false, created };
    }
    created.push({ kind: 'campaign', name: (campaign as { name: string }).name });

    const { data: metric, error: metricError } = await supabase
        .from('impact_metrics')
        .insert({
            organization_id: orgId,
            name: template.metric.name,
            slug: template.metric.slug,
            description: template.metric.description,
            unit: template.metric.unit,
            is_public: false,
            created_by: userId,
        })
        .select('name')
        .single();
    if (metricError) {
        return { success: false, error: metricError.message, alreadySeeded: false, created };
    }
    created.push({ kind: 'impact_metric', name: (metric as { name: string }).name });

    const { data: role, error: roleError } = await supabase
        .from('volunteer_roles')
        .insert({
            organization_id: orgId,
            title: template.volunteerRole.title,
            slug: template.volunteerRole.slug,
            description: template.volunteerRole.description,
            category: template.volunteerRole.category,
            status: 'draft',
            created_by: userId,
        })
        .select('title')
        .single();
    if (roleError) {
        return { success: false, error: roleError.message, alreadySeeded: false, created };
    }
    created.push({ kind: 'volunteer_role', name: (role as { title: string }).title });

    const { data: notifTemplate, error: notifError } = await supabase
        .from('notification_templates')
        .insert({
            organization_id: orgId,
            name: template.notification.name,
            slug: template.notification.slug,
            description: 'Created by the guided setup.',
            channel: 'email',
            subject: template.notification.subject,
            body: template.notification.body,
        })
        .select('name')
        .single();
    if (notifError) {
        return { success: false, error: notifError.message, alreadySeeded: false, created };
    }
    created.push({ kind: 'notification_template', name: (notifTemplate as { name: string }).name });

    // Audit trail. Best-effort: never fail the seeding because of logging.
    const audit = await supabase.from('audit_logs').insert({
        organization_id: orgId,
        user_id: userId,
        action: 'workspace.seeded',
        entity_type: 'workspace_template',
        new_values: { template: archetypeId, items: created },
    });
    if (audit.error) {
        console.warn('[bootstrap] Template seeding audit entry failed:', audit.error.message);
    }

    return { success: true, error: null, alreadySeeded: false, created };
}
