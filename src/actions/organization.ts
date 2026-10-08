'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ACTIVE_ORG_COOKIE, authorizeOrganization, authorizePermission, authorizeUser } from '@/lib/auth/guards';
import type { AppRole } from '@/lib/auth/permissions';
import { DEFAULT_BRAND_THEME, isBrandThemeId, type BrandThemeId } from '@/lib/brand-themes';
import {
    DEFAULT_BRAND_EXPERIENCE,
    isBrandCampaignId,
    parseBrandExperienceSettings,
    toBrandExperienceSettings,
    type BrandExperienceSettings,
} from '@/lib/brand-experience';

export interface MyOrganization {
    id: string;
    name: string | null;
    role: AppRole;
    isActive: boolean;
}

/**
 * Lists every organization the current user belongs to.
 * Used by the global organization switcher.
 */
export async function getMyOrganizations(): Promise<{ data: MyOrganization[] | null; error: string | null }> {
    const auth = await authorizeUser();
    if (!auth.ok) return { data: null, error: auth.error };

    const data: MyOrganization[] = auth.context.memberships.map((membership) => ({
        id: membership.organizationId,
        name: membership.organizationName,
        role: membership.role,
        isActive: membership.organizationId === auth.context.organizationId,
    }));

    return { data, error: null };
}

/**
 * Switches the user's active organization.
 * Verifies membership server-side before persisting the cookie — the client
 * can never grant access to an organization it does not belong to.
 */
export async function switchActiveOrganization(
    organizationId: string,
): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizeUser();
    if (!auth.ok) return { success: false, error: auth.error };

    const membership = auth.context.memberships.find((m) => m.organizationId === organizationId);
    if (!membership) {
        return { success: false, error: 'You are not a member of this organization.' };
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
    });

    // Invalidate all cached data so no stale records from the previous
    // organization are served after switching.
    revalidatePath('/', 'layout');

    return { success: true, error: null };
}

// ---------------------------------------------------------------------------
// Brand theme default (Settings > Branding)
// ---------------------------------------------------------------------------

/**
 * Reads the organization's site-wide default brand theme from
 * organizations.settings->>'brand_theme'. Falls back to 'sunset'.
 * Any org member can read (covered by the organizations SELECT policy).
 */
export async function getDefaultBrandTheme(): Promise<{ data: BrandThemeId; error: string | null }> {
    const auth = await authorizeOrganization();
    if (!auth.ok) return { data: DEFAULT_BRAND_THEME, error: auth.error };

    const { data, error } = await auth.supabase
        .from('organizations')
        .select('settings')
        .eq('id', auth.organizationId)
        .single();

    if (error) return { data: DEFAULT_BRAND_THEME, error: 'Could not load branding settings.' };

    const theme = (data?.settings as Record<string, unknown> | null)?.brand_theme;
    return { data: isBrandThemeId(theme) ? theme : DEFAULT_BRAND_THEME, error: null };
}

/**
 * Sets the organization's site-wide default brand theme.
 * Requires the 'settings.manage' permission (owner/admin).
 * Visitors without a personal override see this theme on next visit;
 * revalidates the full layout so the new default ships immediately.
 */
export async function updateDefaultBrandTheme(
    theme: BrandThemeId,
): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizePermission('settings.manage');
    if (!auth.ok) return { success: false, error: auth.error };
    if (!isBrandThemeId(theme)) return { success: false, error: 'Invalid theme selected.' };

    const { data: org, error: readError } = await auth.supabase
        .from('organizations')
        .select('settings')
        .eq('id', auth.organizationId)
        .single();

    if (readError) return { success: false, error: 'Could not load branding settings.' };

    const merged = {
        ...((org?.settings as Record<string, unknown> | null) ?? {}),
        brand_theme: theme,
    };

    const { error: writeError } = await auth.supabase
        .from('organizations')
        .update({ settings: merged })
        .eq('id', auth.organizationId);

    if (writeError) return { success: false, error: 'Could not save the default theme.' };

    revalidatePath('/', 'layout');
    return { success: true, error: null };
}

/**
 * Reads the complete organization-controlled visual experience. Campaigns are
 * intentionally restricted to reviewed built-in treatments and a bounded time
 * window; organizations cannot inject CSS or scripts into the public site.
 */
export async function getBrandExperienceSettings(): Promise<{
    data: BrandExperienceSettings;
    error: string | null;
}> {
    const auth = await authorizeOrganization();
    if (!auth.ok) return { data: DEFAULT_BRAND_EXPERIENCE, error: auth.error };

    const { data, error } = await auth.supabase
        .from('organizations')
        .select('settings')
        .eq('id', auth.organizationId)
        .single();
    if (error) return { data: DEFAULT_BRAND_EXPERIENCE, error: 'Could not load branding settings.' };

    return { data: parseBrandExperienceSettings(data?.settings), error: null };
}

/** Saves the organization base skin and an optional reviewed campaign schedule. */
export async function updateBrandExperienceSettings(input: BrandExperienceSettings): Promise<{
    success: boolean;
    error: string | null;
}> {
    const auth = await authorizePermission('settings.manage');
    if (!auth.ok) return { success: false, error: auth.error };
    if (!isBrandThemeId(input.baseTheme)) return { success: false, error: 'Invalid base theme selected.' };

    if (input.campaign) {
        if (!isBrandCampaignId(input.campaign.id)) {
            return { success: false, error: 'Invalid campaign theme selected.' };
        }
        const startsAt = new Date(input.campaign.startsAt);
        const endsAt = new Date(input.campaign.endsAt);
        if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
            return { success: false, error: 'Campaign end must be after its start.' };
        }
        // A bounded schedule prevents a forgotten holiday skin becoming a
        // permanent, stale treatment. Long-running campaigns should be
        // renewed explicitly with a new review decision.
        if (endsAt.getTime() - startsAt.getTime() > 366 * 24 * 60 * 60 * 1000) {
            return { success: false, error: 'Campaigns may run for no more than one year.' };
        }
    }

    const { data: org, error: readError } = await auth.supabase
        .from('organizations')
        .select('settings')
        .eq('id', auth.organizationId)
        .single();
    if (readError) return { success: false, error: 'Could not load branding settings.' };

    const merged = {
        ...((org?.settings as Record<string, unknown> | null) ?? {}),
        ...toBrandExperienceSettings(input),
    };
    const { error: writeError } = await auth.supabase
        .from('organizations')
        .update({ settings: merged })
        .eq('id', auth.organizationId);
    if (writeError) return { success: false, error: 'Could not save the branding experience.' };

    revalidatePath('/', 'layout');
    return { success: true, error: null };
}
