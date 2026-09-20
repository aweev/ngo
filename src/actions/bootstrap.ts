'use server';

import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ACTIVE_ORG_COOKIE, authorizeUser } from '@/lib/auth/guards';
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
