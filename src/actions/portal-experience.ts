'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type SupportedLocale } from '@/lib/i18n/locales';
import type { OnboardingOptionGroup, PortalExperienceInput, PortalExperienceItem } from '@/types/domain/portal-experience';

const DEFAULT_ITEMS: PortalExperienceInput[] = [
    { kind: 'auth_testimonial', item_key: 'testimonial_1', label: 'AWE did not just give me skills; they gave me the confidence to lead.', description: null, value: null, icon: 'quote', metadata: { author: 'Sarah J., Program Alumni' }, translations: {}, sort_order: 10, is_enabled: true },
    { kind: 'auth_testimonial', item_key: 'testimonial_2', label: 'Volunteering here changed my perspective on global impact.', description: null, value: null, icon: 'quote', metadata: { author: 'Mark T., Volunteer' }, translations: {}, sort_order: 20, is_enabled: true },
    { kind: 'auth_testimonial', item_key: 'testimonial_3', label: 'Transparency and dignity are at the core of everything we do.', description: null, value: null, icon: 'quote', metadata: { author: 'Elena R., Donor' }, translations: {}, sort_order: 30, is_enabled: true },
    { kind: 'auth_stat', item_key: 'active_volunteers', label: 'Active Volunteers', description: null, value: '1,204', icon: 'users', metadata: {}, translations: {}, sort_order: 10, is_enabled: true },
    { kind: 'auth_stat', item_key: 'lives_impacted', label: 'Lives Impacted', description: null, value: '15k+', icon: 'heart', metadata: {}, translations: {}, sort_order: 20, is_enabled: true },
    { kind: 'auth_stat', item_key: 'projects_funded', label: 'Projects Funded', description: null, value: '142', icon: 'globe', metadata: {}, translations: {}, sort_order: 30, is_enabled: true },
    { kind: 'onboarding_option' as const, item_key: 'role_volunteer', label: 'Volunteer', description: 'I want to offer my time, skills, and energy to make a local impact.', value: null, icon: 'users', metadata: { group: 'role', roles: ['volunteer'] }, translations: {}, sort_order: 10, is_enabled: true },
    { kind: 'onboarding_option' as const, item_key: 'role_donor', label: 'Donor', description: 'I want to fund projects and help shape where support goes.', value: null, icon: 'heart', metadata: { group: 'role', roles: ['donor'] }, translations: {}, sort_order: 20, is_enabled: true },
    ...[
        ['teaching', 'Teaching', 'skills', 'volunteer'], ['fundraising', 'Fundraising', 'skills', 'volunteer'], ['events', 'Events', 'skills', 'volunteer'], ['communications', 'Communications', 'skills', 'volunteer'], ['technology', 'Technology', 'skills', 'volunteer'], ['project-management', 'Project management', 'skills', 'volunteer'],
        ['weekdays', 'Weekdays', 'availability', 'volunteer,donor'], ['evenings', 'Evenings', 'availability', 'volunteer,donor'], ['weekends', 'Weekends', 'availability', 'volunteer,donor'],
        ['education', 'Education', 'causes', 'donor'], ['community-development', 'Community development', 'causes', 'donor'], ['climate-action', 'Climate action', 'causes', 'donor'], ['equality-inclusion', 'Equality and inclusion', 'causes', 'donor'],
    ].map(([item_key, label, group, roles], index) => ({ kind: 'onboarding_option' as const, item_key, label, description: null, value: null, icon: null, metadata: { group: group as OnboardingOptionGroup, roles: roles.split(',') as ('volunteer' | 'donor')[] }, translations: {}, sort_order: index + 30, is_enabled: true })),
];

function localize(item: PortalExperienceItem, locale: string) {
    const translations = item.translations ?? {};
    const selected = translations[locale as SupportedLocale] ?? translations[locale.split('-')[0] as SupportedLocale] ?? translations.en ?? {};
    return {
        ...item,
        label: selected.label || item.label,
        description: selected.description || item.description,
        value: selected.value || item.value,
        author: selected.author || (item.metadata.author as string | undefined),
    };
}

export async function getPublicPortalExperience(locale = 'en') {
    const supabase = await createSupabaseServerClient();
    const { data: organizationId } = await supabase.rpc('public_default_org_id');
    if (!organizationId) return { data: [] as PortalExperienceItem[], error: null };

    const { data, error } = await supabase.from('portal_experience_items').select('*').eq('organization_id', organizationId).eq('is_enabled', true).order('sort_order');
    if (error) return { data: [] as PortalExperienceItem[], error: 'Unable to load portal configuration.' };
    return { data: (data ?? []).map((item) => localize(item as PortalExperienceItem, locale)), error: null };
}

export async function getPortalExperienceItems(): Promise<{ data: PortalExperienceItem[]; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.settings.read);
    if (!auth.ok) return { data: [], error: auth.error };
    const { data, error } = await auth.supabase.from('portal_experience_items').select('*').eq('organization_id', auth.organizationId).order('kind').order('sort_order');
    if (error) return { data: [], error: 'Unable to load portal configuration.' };
    return { data: (data ?? []) as PortalExperienceItem[], error: null };
}

export async function ensurePortalExperienceDefaults(): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.settings.manage);
    if (!auth.ok) return { success: false, error: auth.error };
    const { data: existing, error: readError } = await auth.supabase.from('portal_experience_items').select('kind, item_key').eq('organization_id', auth.organizationId);
    if (readError) return { success: false, error: 'Unable to inspect portal configuration.' };
    const existingKeys = new Set((existing ?? []).map((item) => `${item.kind}:${item.item_key}`));
    const missing = DEFAULT_ITEMS.filter((item) => !existingKeys.has(`${item.kind}:${item.item_key}`)).map((item) => ({ ...item, organization_id: auth.organizationId }));
    if (missing.length > 0) {
        const { error } = await auth.supabase.from('portal_experience_items').insert(missing);
        if (error) return { success: false, error: 'Unable to create portal defaults.' };
    }
    revalidatePath('/admin/settings');
    revalidatePath('/auth/login');
    revalidatePath('/auth/onboarding/welcome');
    return { success: true, error: null };
}

export async function savePortalExperienceItem(id: string | null, input: PortalExperienceInput): Promise<{ data: PortalExperienceItem | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.settings.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (!input.label.trim() || !input.item_key.trim()) return { data: null, error: 'A key and label are required.' };
    const query = id
        ? auth.supabase.from('portal_experience_items').update(input).eq('id', id).eq('organization_id', auth.organizationId)
        : auth.supabase.from('portal_experience_items').insert({ ...input, organization_id: auth.organizationId });
    const { data, error } = await query.select().single();
    if (error) return { data: null, error: 'Unable to save portal configuration.' };
    revalidatePath('/admin/settings');
    revalidatePath('/auth/login');
    revalidatePath('/auth/onboarding/welcome');
    return { data: data as PortalExperienceItem, error: null };
}

export async function deletePortalExperienceItem(id: string): Promise<{ success: boolean; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.settings.manage);
    if (!auth.ok) return { success: false, error: auth.error };
    const { error } = await auth.supabase.from('portal_experience_items').delete().eq('id', id).eq('organization_id', auth.organizationId);
    if (error) return { success: false, error: 'Unable to delete portal configuration.' };
    revalidatePath('/admin/settings');
    return { success: true, error: null };
}