'use server';

import { z } from 'zod';
import { createSupabaseServerClient, createSupabasePublicClient } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/rate-limit';

type PublicCampaign = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    goal_amount: number;
    raised_amount: number;
    currency: string;
    cover_image_url: string | null;
    video_url: string | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
};

type PublicProject = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    location: string | null;
    country: string | null;
    beneficiaries_target: number | null;
    beneficiaries_reached: number;
    progress: number;
    cover_image_url: string | null;
    gallery_urls: string[];
    created_at: string;
    budget?: number | null;
    spent?: number;
    currency?: string;
};

type PublicPartner = {
    id: string;
    name: string;
    type: string;
    partnership_type: string;
    website: string | null;
    description: string | null;
    logo_url: string | null;
    created_at: string;
};

type PublicContentPage = {
    id: string;
    title: string;
    slug: string;
    content: Record<string, unknown>;
    meta_title: string | null;
    meta_description: string | null;
    cover_image_url: string | null;
    published_at: string | null;
    created_at: string;
    updated_at: string;
};

type PublishedTranslationRow = {
    page_id: string;
    locale: string;
    title: string;
    content: Record<string, unknown>;
    meta_title: string | null;
    meta_description: string | null;
    cover_image_url: string | null;
    cover_alt_text: string | null;
    cta_label: string | null;
    cta_url: string | null;
    category_label: string | null;
};

/**
 * Overlays a PUBLISHED translation row onto the base page.
 * Only rows with status='published' ever reach this function (the
 * public_content_page_translations view filters the rest), so draft /
 * machine-translated / in-review text can never leak to the public site.
 */
function applyPublishedRow(page: PublicContentPage, row: PublishedTranslationRow): PublicContentPage {
    const base = (page.content ?? {}) as Record<string, unknown>;
    const extra = (row.content ?? {}) as Record<string, unknown>;
    return {
        ...page,
        title: row.title || page.title,
        meta_title: row.meta_title ?? page.meta_title,
        meta_description: row.meta_description ?? page.meta_description,
        cover_image_url: row.cover_image_url ?? page.cover_image_url,
        content: {
            ...base,
            ...extra,
            title: row.title,
            ...(row.cover_alt_text ? { cover_alt_text: row.cover_alt_text } : {}),
            ...(row.cta_label ? { cta_label: row.cta_label } : {}),
            ...(row.cta_url ? { cta_url: row.cta_url } : {}),
            ...(row.category_label ? { category_label: row.category_label, category: row.category_label } : {}),
        },
    };
}

function localizeLegacyJson(page: PublicContentPage, locale = 'en'): PublicContentPage {
    const content = (page.content ?? {}) as Record<string, unknown>;
    // Legacy JSON inside content.translations (pre-migration-22). Kept as
    // read-only fallback; new content uses content_page_translations rows.
    // NOTE: legacy blobs carry no approval state, so they are served only
    // for already-published pages and flagged via usedFallback upstream.
    const translations = (content.translations ?? content.locales) as Record<string, unknown> | undefined;
    const requested = translations?.[locale] ?? translations?.[locale.split('-')[0]];
    if (!requested || typeof requested !== 'object' || Array.isArray(requested)) return page;

    const localized = requested as Record<string, unknown>;
    const localizedContent = localized.content && typeof localized.content === 'object' && !Array.isArray(localized.content)
        ? localized.content as Record<string, unknown>
        : localized;
    return {
        ...page,
        title: typeof localized.title === 'string' ? localized.title : page.title,
        meta_title: typeof localized.meta_title === 'string' ? localized.meta_title : page.meta_title,
        meta_description: typeof localized.meta_description === 'string' ? localized.meta_description : page.meta_description,
        cover_image_url: typeof localized.cover_image_url === 'string' ? localized.cover_image_url : page.cover_image_url,
        content: { ...content, ...localizedContent },
    };
}

/**
 * Batch-fetches published translation rows for the given pages.
 * Returns a map of page_id -> (locale -> row). Missing view (migration not
 * applied yet) resolves to an empty map so callers fall back to legacy JSON.
 */
async function fetchPublishedRows(
    supabase: ReturnType<typeof createSupabasePublicClient>,
    pageIds: string[],
): Promise<Map<string, Map<string, PublishedTranslationRow>>> {
    const map = new Map<string, Map<string, PublishedTranslationRow>>();
    if (pageIds.length === 0) return map;
    try {
        const { data, error } = await supabase
            .from('public_content_page_translations')
            .select('*')
            .in('page_id', pageIds);
        if (error || !data) return map;
        for (const row of data as PublishedTranslationRow[]) {
            if (!map.has(row.page_id)) map.set(row.page_id, new Map());
            map.get(row.page_id)!.set(row.locale, row);
        }
    } catch {
        // View missing -> legacy JSON fallback.
    }
    return map;
}

function localizeWithRows(
    page: PublicContentPage,
    locale: string,
    rows: Map<string, PublishedTranslationRow> | undefined,
): { page: PublicContentPage; usedFallback: boolean } {
    const base = locale.split('-')[0] ?? locale;
    const chain = base === 'en' ? ['en'] : [locale, base, 'en'];
    if (rows) {
        for (const loc of chain) {
            const row = rows.get(loc);
            if (row) {
                return { page: applyPublishedRow(page, row), usedFallback: loc !== locale };
            }
        }
    }
    const before = page.title;
    const localized = localizeLegacyJson(page, locale);
    return { page: localized, usedFallback: localized.title !== before || locale !== 'en' };
}

type PublicImpactMetric = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    unit: string;
    category: string | null;
    current_value: number;
    target_value: number | null;
    baseline_value: number;
    created_at: string;
};

type PublicEvent = {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    type: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
    city: string | null;
    country: string | null;
    virtual_link: string | null;
    max_attendees: number | null;
    registered_count: number;
    cover_image_url: string | null;
    created_at: string;
};

// Display-only localized labels. Canonical keys (e.g. project `category`)
// are never overwritten so grouping/filtering logic stays stable.
type LocalizedDisplay = {
    category_label?: string;
    mission?: string;
    vision?: string;
    cta_label?: string;
    cta_url?: string;
};

// =====================================================
// ENTITY TRANSLATIONS (migration 23) — campaigns, projects,
// partners, impact metrics, events, organization.
// Only status='published' rows are served (view-filtered).
// =====================================================

type EntityTranslationRow = {
    entity_type: string;
    entity_id: string;
    locale: string;
    fields: Record<string, unknown>;
};

function entityLocaleChain(locale: string): string[] {
    const base = locale.split('-')[0] ?? locale;
    if (base === 'en') return ['en'];
    if (locale !== base) return [locale, base, 'en'];
    return [base, 'en'];
}

async function fetchEntityRows(
    supabase: ReturnType<typeof createSupabasePublicClient>,
    entityType: string,
    entityIds: string[],
): Promise<Map<string, Map<string, Record<string, unknown>>>> {
    const map = new Map<string, Map<string, Record<string, unknown>>>();
    if (entityIds.length === 0) return map;
    try {
        const { data, error } = await supabase
            .from('public_entity_translations')
            .select('entity_id, locale, fields')
            .eq('entity_type', entityType)
            .in('entity_id', entityIds);
        if (error || !data) return map;
        for (const row of data as EntityTranslationRow[]) {
            if (!map.has(row.entity_id)) map.set(row.entity_id, new Map());
            map.get(row.entity_id)!.set(row.locale, (row.fields ?? {}) as Record<string, unknown>);
        }
    } catch {
        // View missing (migration not applied) -> serve base content.
    }
    return map;
}

function pickEntityFields(
    entityId: string,
    locale: string,
    rows: Map<string, Map<string, Record<string, unknown>>>,
): Record<string, unknown> | null {
    const byLocale = rows.get(entityId);
    if (!byLocale) return null;
    for (const loc of entityLocaleChain(locale)) {
        const fields = byLocale.get(loc);
        if (fields && Object.keys(fields).length > 0) return fields;
    }
    return null;
}

function strField(fields: Record<string, unknown>, ...keys: string[]): string | undefined {
    for (const k of keys) {
        const v = fields[k];
        if (typeof v === 'string' && v.trim().length > 0) return v;
    }
    return undefined;
}

// =====================================================
// PUBLIC DATA - No authentication required
// These functions fetch data that is publicly visible
// =====================================================

/**
 * Get public campaigns for the landing page, localized.
 * Overlays published `campaign` translations (name/description/CTA);
 * falls back to base content when untranslated.
 */
export async function getPublicCampaigns(
    locale = 'en',
): Promise<{ data: (PublicCampaign & Partial<LocalizedDisplay>)[] | null; error: string | null }> {
    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
        .from('public_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching public campaigns:', error);
        return { data: null, error: error.message };
    }

    const rows = (data ?? []) as PublicCampaign[];
    const t = await fetchEntityRows(supabase, 'campaign', rows.map((r) => r.id));
    return {
        data: rows.map((r) => {
            const f = pickEntityFields(r.id, locale, t);
            if (!f) return r;
            return {
                ...r,
                name: strField(f, 'name') ?? r.name,
                description: strField(f, 'description') ?? r.description,
                cta_label: strField(f, 'cta_label'),
                cta_url: strField(f, 'cta_url'),
            };
        }),
        error: null,
    };
}

/**
 * Get public projects for the landing page, localized.
 * `category` stays canonical (pillar matching); translated display
 * label is exposed as `category_label`.
 */
export async function getPublicProjects(
    locale = 'en',
): Promise<{ data: (PublicProject & Partial<LocalizedDisplay>)[] | null; error: string | null }> {
    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
        .from('public_projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

    if (error) {
        console.error('Error fetching public projects:', error);
        return { data: null, error: error.message };
    }

    const rows = (data ?? []) as PublicProject[];
    const t = await fetchEntityRows(supabase, 'project', rows.map((r) => r.id));
    return {
        data: rows.map((r) => {
            const f = pickEntityFields(r.id, locale, t);
            if (!f) return r;
            return {
                ...r,
                name: strField(f, 'name') ?? r.name,
                description: strField(f, 'description') ?? r.description,
                location: strField(f, 'location') ?? r.location,
                country: strField(f, 'country') ?? r.country,
                category_label: strField(f, 'category_label'),
            };
        }),
        error: null,
    };
}

/**
 * Get public partners for the trust marquee, localized (name/description).
 */
export async function getPublicPartners(
    locale = 'en',
): Promise<{ data: PublicPartner[] | null; error: string | null }> {
    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
        .from('public_partners')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching public partners:', error);
        return { data: null, error: error.message };
    }

    const rows = (data ?? []) as PublicPartner[];
    const t = await fetchEntityRows(supabase, 'partner', rows.map((r) => r.id));
    return {
        data: rows.map((r) => {
            const f = pickEntityFields(r.id, locale, t);
            if (!f) return r;
            return {
                ...r,
                name: strField(f, 'name') ?? r.name,
                description: strField(f, 'description') ?? r.description,
            };
        }),
        error: null,
    };
}

/**
 * Get public donations statistics
 */
export async function getPublicStats(): Promise<{
    totalDonations: number;
    totalAmount: number;
    activeProjects: number;
    activeCampaigns: number;
    totalVolunteers: number;
    totalBeneficiaries: number;
    upcomingEvents: number;
    error: string | null;
}> {
    const supabase = createSupabasePublicClient();

    // Aggregated by the SECURITY DEFINER function public_impact_stats() —
    // anonymous visitors never read individual donation rows.
    const { data, error } = await supabase.rpc('public_impact_stats');

    if (error) {
        console.error('Error fetching public stats:', error);
        return { totalDonations: 0, totalAmount: 0, activeProjects: 0, activeCampaigns: 0, totalVolunteers: 0, totalBeneficiaries: 0, upcomingEvents: 0, error: error.message };
    }

    const stats = (data ?? {}) as {
        total_donations?: number;
        total_amount?: number;
        active_projects?: number;
        active_campaigns?: number;
        total_volunteers?: number;
        total_beneficiaries?: number;
        upcoming_events?: number;
    };

    return {
        totalDonations: stats.total_donations ?? 0,
        totalAmount: stats.total_amount ?? 0,
        activeProjects: stats.active_projects ?? 0,
        activeCampaigns: stats.active_campaigns ?? 0,
        totalVolunteers: stats.total_volunteers ?? 0,
        totalBeneficiaries: stats.total_beneficiaries ?? 0,
        upcomingEvents: stats.upcoming_events ?? 0,
        error: null,
    };
}

/**
 * Get a single campaign by slug (public), localized.
 */
export async function getPublicCampaignBySlug(
    slug: string,
    locale = 'en',
): Promise<{ data: (PublicCampaign & Partial<LocalizedDisplay>) | null; error: string | null }> {
    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
        .from('public_campaigns')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (error) {
        return { data: null, error: error.message };
    }
    if (!data) return { data: null, error: null };

    const row = data as PublicCampaign;
    const t = await fetchEntityRows(supabase, 'campaign', [row.id]);
    const f = pickEntityFields(row.id, locale, t);
    if (!f) return { data: row, error: null };
    return {
        data: {
            ...row,
            name: strField(f, 'name') ?? row.name,
            description: strField(f, 'description') ?? row.description,
            cta_label: strField(f, 'cta_label'),
            cta_url: strField(f, 'cta_url'),
        },
        error: null,
    };
}

/**
 * Get a single project by slug (public), localized.
 */
export async function getPublicProjectBySlug(
    slug: string,
    locale = 'en',
): Promise<{ data: (PublicProject & Partial<LocalizedDisplay>) | null; error: string | null }> {
    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
        .from('public_projects')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (error) {
        return { data: null, error: error.message };
    }
    if (!data) return { data: null, error: null };

    const row = data as PublicProject;
    const t = await fetchEntityRows(supabase, 'project', [row.id]);
    const f = pickEntityFields(row.id, locale, t);
    if (!f) return { data: row, error: null };
    return {
        data: {
            ...row,
            name: strField(f, 'name') ?? row.name,
            description: strField(f, 'description') ?? row.description,
            location: strField(f, 'location') ?? row.location,
            country: strField(f, 'country') ?? row.country,
            category_label: strField(f, 'category_label'),
        },
        error: null,
    };
}

/**
 * Get public projects filtered by canonical category (public program pages),
 * localized for display. Filtering always uses the canonical `category`
 * key so translated labels never break pillar matching.
 */
export async function getPublicProjectsByCategory(
    category: string,
    locale = 'en',
): Promise<{ data: (PublicProject & Partial<LocalizedDisplay>)[] | null; error: string | null }> {
    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
        .from('public_projects')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false })
        .limit(6);

    if (error) {
        console.error('Error fetching public projects by category:', error);
        return { data: null, error: error.message };
    }

    const rows = (data ?? []) as PublicProject[];
    const t = await fetchEntityRows(supabase, 'project', rows.map((r) => r.id));
    return {
        data: rows.map((r) => {
            const f = pickEntityFields(r.id, locale, t);
            if (!f) return r;
            return {
                ...r,
                name: strField(f, 'name') ?? r.name,
                description: strField(f, 'description') ?? r.description,
                location: strField(f, 'location') ?? r.location,
                country: strField(f, 'country') ?? r.country,
                category_label: strField(f, 'category_label'),
            };
        }),
        error: null,
    };
}

/**
 * Subscribe to newsletter
 * Stores the subscriber in Supabase (idempotent via unique email constraint)
 */
export async function subscribeToNewsletter(email: string, locale?: string): Promise<{ success: boolean; error: string | null }> {
    const normalizedEmail = email.trim().toLowerCase();
    const parsed = z.string().email().max(200).safeParse(normalizedEmail);
    if (!parsed.success) {
        return { success: false, error: 'Invalid email address' };
    }

    const rate = await enforceRateLimit('newsletter');
    if (!rate.ok) return { success: false, error: rate.error };

    const supabase = await createSupabaseServerClient();

    // Attribute to the default organization (single-NGO deployments)
    const { data: orgId } = await supabase.rpc('public_default_org_id');

    const { error } = await supabase
        .from('newsletter_subscribers')
        .upsert(
            {
                email: normalizedEmail,
                organization_id: orgId ?? null,
                locale: locale ?? null,
                status: 'subscribed',
                subscribed_at: new Date().toISOString(),
            },
            { onConflict: 'email' }
        );

    if (error) {
        console.error('Error subscribing to newsletter:', error);
        return { success: false, error: 'Unable to subscribe right now. Please try again later.' };
    }

    return { success: true, error: null };
}

/**
 * Submit a public form (contact, safeguarding, corporate inquiry, ...)
 * No authentication required - backed by public INSERT RLS policy.
 *
 * Server is the security boundary: each formSlug has a strict schema
 * (required fields, enums, max lengths). Unknown keys are stripped.
 * Client-side zod schemas are UX only and can always be bypassed.
 */
const PUBLIC_FORM_SCHEMAS = {
    'contact-form': z.object({
        name: z.string().trim().min(2).max(100),
        email: z.string().trim().email().max(200),
        topic: z.enum(['general', 'donation', 'volunteer', 'partner', 'report']),
        company: z.string().trim().max(100).optional(),
        message: z.string().trim().min(10).max(4000),
        consent: z.literal(true),
    }),
    'safeguarding': z.object({
        isAnonymous: z.boolean(),
        name: z.string().trim().max(100).optional(),
        email: z.string().trim().max(200).optional(),
        category: z.enum(['fraud', 'safeguarding', 'harassment', 'security', 'other']),
        message: z.string().trim().min(20).max(4000),
    }).superRefine((val, ctx) => {
        if (!val.isAnonymous) {
            if (!val.name || val.name.trim().length < 2) {
                ctx.addIssue({ code: 'custom', message: 'Name is required', path: ['name'] });
            }
            if (!val.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.email.trim())) {
                ctx.addIssue({ code: 'custom', message: 'Valid email is required', path: ['email'] });
            }
        }
    }),
    'corporate-inquiry': z.object({
        companyName: z.string().trim().min(2).max(150),
        contactPerson: z.string().trim().min(2).max(100),
        email: z.string().trim().email().max(200),
        industry: z.string().trim().min(2).max(100),
        budget: z.enum(['5-10k', '10-50k', '50k+']),
        goals: z.string().trim().min(10).max(4000),
    }),
    'newsletter-signup': z.object({
        email: z.string().trim().email().max(200),
    }),
} as const;

type PublicFormSlug = keyof typeof PUBLIC_FORM_SCHEMAS;

export async function submitPublicForm(
    formSlug: string,
    data: Record<string, unknown>,
    locale?: string
): Promise<{ success: boolean; id?: string; error: string | null }> {
    if (!(formSlug in PUBLIC_FORM_SCHEMAS)) {
        return { success: false, error: 'Unknown form' };
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { success: false, error: 'Invalid submission data' };
    }

    const schema = PUBLIC_FORM_SCHEMAS[formSlug as PublicFormSlug];
    const parsed = (schema as z.ZodType).safeParse(data);
    if (!parsed.success) {
        return { success: false, error: 'Invalid submission data' };
    }
    const cleanData = parsed.data as Record<string, unknown>;

    const rate = await enforceRateLimit('form');
    if (!rate.ok) return { success: false, error: rate.error };

    const supabase = await createSupabaseServerClient();

    const { data: orgId } = await supabase.rpc('public_default_org_id');

    const { data: submission, error } = await supabase
        .from('form_submissions')
        .insert({
            organization_id: orgId ?? null,
            form_slug: formSlug,
            submission_data: cleanData,
            locale: locale ?? null,
        })
        .select('id')
        .single();

    if (error) {
        console.error('Error submitting form:', error);
        return { success: false, error: 'Unable to submit your message right now. Please try again later.' };
    }

    return { success: true, id: submission?.id, error: null };
}

/**
 * Create a public donation pledge
 * Stored as 'pending' until a payment provider confirms the transaction
 */
export async function createPublicDonation(input: {
    amount: number;
    currency?: string;
    type?: 'one_time' | 'recurring';
    email?: string;
    needsReceipt?: boolean;
}): Promise<{ success: boolean; reference?: string; error: string | null }> {
    const { amount, currency = 'EUR', type = 'one_time', email, needsReceipt } = input;

    const parsed = z
        .object({
            amount: z.number().positive().max(1_000_000),
            currency: z.enum(['EUR']).default('EUR'),
            type: z.enum(['one_time', 'recurring']).default('one_time'),
        })
        .safeParse({ amount, currency, type });
    if (!parsed.success) {
        return { success: false, error: 'Invalid donation amount' };
    }

    if (email) {
        const emailCheck = z.string().email().max(200).safeParse(email.trim());
        if (!emailCheck.success) {
            return { success: false, error: 'Invalid email address' };
        }
    }

    const rate = await enforceRateLimit('donation');
    if (!rate.ok) return { success: false, error: rate.error };

    const supabase = await createSupabaseServerClient();

    // donations.organization_id is NOT NULL - we require a configured organization
    const { data: orgId } = await supabase.rpc('public_default_org_id');

    if (!orgId) {
        return { success: false, error: 'No organization configured. Please complete the database setup.' };
    }

    const reference = `WEB-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabase.from('donations').insert({
        organization_id: orgId,
        amount,
        currency,
        type,
        status: 'pending',
        payment_method: 'online',
        payment_reference: reference,
        email: email ? email.trim() : null,
        donor_name: null,
        needs_receipt: Boolean(needsReceipt),
        notes: null,
    });

    if (error) {
        console.error('Error creating donation:', error);
        return { success: false, error: 'Unable to record your donation right now. Please try again later.' };
    }

    return { success: true, reference, error: null };
}

// =====================================================
// PAYMENTS — Stripe Checkout (optional provider)
// When STRIPE_SECRET_KEY is configured, donations complete
// through Stripe Checkout and are confirmed by the webhook
// (`/api/stripe/webhook`). When it is not configured, the
// widget records an explicit "pledge" and says so honestly.
// =====================================================

export type DonationCheckoutResult = {
    success: boolean;
    /** 'checkout' = hosted Stripe payment; 'pledge' = recorded pledge only. */
    mode: 'checkout' | 'pledge';
    url?: string;
    reference?: string;
    error: string | null;
};

export async function createDonationCheckout(input: {
    amount: number;
    currency?: string;
    type?: 'one_time' | 'recurring';
    email: string;
    /** Legal name — required by the org to issue a tax receipt. */
    fullName?: string;
    needsReceipt?: boolean;
    locale?: string;
}): Promise<DonationCheckoutResult> {
    const parsed = z
        .object({
            amount: z.number().positive().max(1_000_000),
            currency: z.enum(['EUR']).default('EUR'),
            type: z.enum(['one_time', 'recurring']).default('one_time'),
            email: z.string().email().max(200),
            fullName: z.string().trim().min(2).max(200).optional(),
            needsReceipt: z.boolean().optional(),
            locale: z.string().max(8).optional(),
        })
        .safeParse(input);
    if (!parsed.success) {
        return { success: false, mode: 'pledge', error: 'Invalid donation details.' };
    }
    const { amount, currency, type, email, fullName, needsReceipt, locale } = parsed.data;

    const rate = await enforceRateLimit('checkout');
    if (!rate.ok) return { success: false, mode: 'pledge', error: rate.error };

    const supabase = await createSupabaseServerClient();
    const { data: orgId, error: orgError } = await supabase.rpc('public_default_org_id');
    if (orgError || !orgId) {
        return { success: false, mode: 'pledge', error: 'No organization configured. Please complete the database setup.' };
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (secret) {
        let session: { id: string; url: string | null };
        try {
            const { default: Stripe } = await import('stripe');
            const stripe = new Stripe(secret);
            const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const loc = locale && locale.length >= 2 ? locale : 'en';

            const created = await stripe.checkout.sessions.create({
                mode: type === 'recurring' ? 'subscription' : 'payment',
                customer_email: email,
                line_items: [
                    {
                        quantity: 1,
                        price_data: {
                            currency: currency.toLowerCase(),
                            unit_amount: Math.round(amount * 100),
                            product_data: { name: 'Donation — AWE' },
                            ...(type === 'recurring' ? { recurring: { interval: 'month' as const } } : {}),
                        },
                    },
                ],
                metadata: {
                    donation_type: type,
                    needs_receipt: needsReceipt ? 'yes' : 'no',
                },
                success_url: `${origin}/${loc}/public/get-involved/donate/thank-you?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${origin}/${loc}/public/get-involved/donate?canceled=1`,
            });
            session = { id: created.id, url: created.url };
        } catch (err) {
            console.error('[createDonationCheckout] Stripe error:', err);
            return { success: false, mode: 'pledge', error: 'Payment provider error. Please try again later.' };
        }

        // Fail closed: never hand out a Checkout URL without a persisted
        // pending row. Otherwise the user pays and the webhook logs
        // `unmatched:true` with no local record of the money.
        const reference = `WEB-${Date.now().toString(36).toUpperCase()}`;
        const { error: insertError } = await supabase.from('donations').insert({
            organization_id: orgId,
            amount,
            currency,
            type,
            status: 'pending',
            payment_method: 'online',
            payment_reference: reference,
            email: email.trim(),
            donor_name: fullName?.trim() || null,
            needs_receipt: Boolean(needsReceipt),
            notes: null,
            payment_provider: 'stripe',
            payment_ref: session.id,
        });
        if (insertError) {
            console.error('[createDonationCheckout] Pending-row insert failed:', insertError.message);
            try {
                const { default: Stripe } = await import('stripe');
                await new Stripe(secret).checkout.sessions.expire(session.id);
            } catch {
                // Session will expire on its own; the insert failure is what matters.
            }
            return { success: false, mode: 'pledge', error: 'Unable to start checkout right now. Please try again later.' };
        }

        return { success: true, mode: 'checkout', url: session.url ?? undefined, reference, error: null };
    }

    // Provider not configured — record an explicit pledge (honest fallback).
    const pledge = await createPublicDonation({ amount, currency, type, email, needsReceipt });
    return {
        success: pledge.success,
        mode: 'pledge',
        reference: pledge.reference,
        error: pledge.error,
    };
}

// =====================================================
// HOMEPAGE — powered by the admin command center
// (content_pages, impact_metrics, org_events).
// All reads go through anon-safe public_* views.
// =====================================================


/**
 * Get a single published content page by slug.
 * Admin manages via /admin/content (status = published).
 * Used for editable homepage sections:
 * `homepage-hero`, `homepage-mission`, `homepage-get-involved`.
 */
export async function getPublicContentPage(
    slug: string,
    locale = 'en',
): Promise<{ data: PublicContentPage | null; error: string | null; usedFallback?: boolean }> {
    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
        .from('public_content_pages')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (error) {
        console.error(`Error fetching public content page ${slug}:`, error);
        return { data: null, error: error.message };
    }
    if (!data) return { data: null, error: null };

    const page = data as PublicContentPage;
    const rows = await fetchPublishedRows(supabase, [page.id]);
    const { page: localized, usedFallback } = localizeWithRows(page, locale, rows.get(page.id));
    return { data: localized, error: null, usedFallback };
}

/**
 * List published content pages filtered by the `category` key
 * inside the JSONB `content` column (admin sets e.g.
 * category = 'news' | 'story' | 'testimonial').
 * Falls back to slug-prefix matching (`news-*`, `story-*`)
 * so older content still appears.
 */
export async function getPublicContentByCategory(
    category: 'news' | 'story' | 'testimonial' | 'team_member' | 'milestone' | 'document',
    limit = 6,
    locale = 'en'
): Promise<{ data: PublicContentPage[] | null; error: string | null }> {
    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
        .from('public_content_pages')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error(`Error fetching public ${category} content:`, error);
        return { data: null, error: error.message };
    }

    const pages = (data ?? []) as PublicContentPage[];
    const rowMap = await fetchPublishedRows(
        supabase,
        pages.map((p) => p.id),
    );
    const rows = pages.map((row) => localizeWithRows(row, locale, rowMap.get(row.id)).page);
    const filtered = rows.filter((row) => {
        const c = (row.content ?? {}) as Record<string, unknown>;
        const cat = typeof c.category === 'string' ? c.category.toLowerCase() : '';
        if (cat === category) return true;
        // Backwards-compatible: slug conventions + legacy `type` key
        if (typeof c.type === 'string' && c.type.toLowerCase() === category) return true;
        if (row.slug.startsWith(`${category}-`)) return true;
        if (category === 'story' && row.slug.startsWith('stories/')) return true;
        if (category === 'team_member' && row.slug.startsWith('team-')) return true;
        if (category === 'milestone' && row.slug.startsWith('milestone-')) return true;
        if (category === 'document' && row.slug.startsWith('doc-')) return true;
        return false;
    });

    // Milestones read chronologically; everything else newest-first.
    if (category === 'milestone') {
        filtered.sort((a, b) => {
            const ya = Number((a.content as Record<string, unknown>).year ?? 0);
            const yb = Number((b.content as Record<string, unknown>).year ?? 0);
            return ya - yb;
        });
    }

    return { data: filtered.slice(0, limit), error: null };
}

/** Latest news from the CMS (admin: content_pages, category = 'news'). */
export async function getPublicNews(limit = 3, locale = 'en'): Promise<{ data: PublicContentPage[] | null; error: string | null }> {
    return getPublicContentByCategory('news', limit, locale);
}

/** Success stories from the CMS (admin: content_pages, category = 'story'). */
export async function getPublicStories(limit = 5, locale = 'en'): Promise<{ data: PublicContentPage[] | null; error: string | null }> {
    return getPublicContentByCategory('story', limit, locale);
}

/** Testimonials from the CMS (admin: content_pages, category = 'testimonial'). */
export async function getPublicTestimonials(limit = 5, locale = 'en'): Promise<{ data: PublicContentPage[] | null; error: string | null }> {
    return getPublicContentByCategory('testimonial', limit, locale);
}

/**
 * Public impact metrics (admin: /admin/impact, is_public = true), localized.
 * Numeric values are never translated; name/description/unit_label are.
 */
export async function getPublicImpactMetrics(
    locale = 'en',
): Promise<{ data: PublicImpactMetric[] | null; error: string | null }> {
    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
        .from('public_impact_metrics')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(8);

    if (error) {
        console.error('Error fetching public impact metrics:', error);
        return { data: null, error: error.message };
    }

    const rows = (data ?? []) as PublicImpactMetric[];
    const t = await fetchEntityRows(supabase, 'impact_metric', rows.map((r) => r.id));
    return {
        data: rows.map((r) => {
            const f = pickEntityFields(r.id, locale, t);
            if (!f) return r;
            return {
                ...r,
                name: strField(f, 'name') ?? r.name,
                description: strField(f, 'description') ?? r.description,
                unit: strField(f, 'unit_label') ?? r.unit,
            };
        }),
        error: null,
    };
}

/**
 * Upcoming public events (admin: /admin/events, published + public),
 * localized. Times/timezones are formatted per locale at render time;
 * only display strings are translated here.
 */
export async function getPublicEvents(
    limit = 3,
    locale = 'en',
): Promise<{ data: PublicEvent[] | null; error: string | null }> {
    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
        .from('public_events')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(limit);

    if (error) {
        console.error('Error fetching public events:', error);
        return { data: null, error: error.message };
    }

    const rows = (data ?? []) as PublicEvent[];
    const t = await fetchEntityRows(supabase, 'org_event', rows.map((r) => r.id));
    return {
        data: rows.map((r) => {
            const f = pickEntityFields(r.id, locale, t);
            if (!f) return r;
            return {
                ...r,
                title: strField(f, 'title') ?? r.title,
                description: strField(f, 'description') ?? r.description,
                location: strField(f, 'location') ?? r.location,
                city: strField(f, 'city') ?? r.city,
                country: strField(f, 'country') ?? r.country,
            };
        }),
        error: null,
    };
}

/**
 * Get a single published public event by slug (admin: /admin/events),
 * localized. Past events stay reachable while their row remains
 * published + public; the listing itself only shows upcoming dates.
 */
export async function getPublicEventBySlug(
    slug: string,
    locale = 'en',
): Promise<{ data: PublicEvent | null; error: string | null }> {
    const supabase = createSupabasePublicClient();

    const { data, error } = await supabase
        .from('public_events')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

    if (error) {
        console.error('Error fetching public event:', error);
        return { data: null, error: error.message };
    }
    if (!data) return { data: null, error: null };

    const row = data as PublicEvent;
    const t = await fetchEntityRows(supabase, 'org_event', [row.id]);
    const f = pickEntityFields(row.id, locale, t);
    if (!f) return { data: row, error: null };
    return {
        data: {
            ...row,
            title: strField(f, 'title') ?? row.title,
            description: strField(f, 'description') ?? row.description,
            location: strField(f, 'location') ?? row.location,
            city: strField(f, 'city') ?? row.city,
            country: strField(f, 'country') ?? row.country,
        },
        error: null,
    };
}

export type { PublicContentPage, PublicImpactMetric, PublicEvent };

// =====================================================
// ABOUT — powered by the admin command center
// (content_pages categories: team_member / milestone / document,
// organizations profile, financial aggregates).
// All reads go through anon-safe public_* views / functions.
// =====================================================

export type PublicTeamMember = {
    id: string;
    slug: string;
    name: string;
    role: string;
    category: 'Leadership' | 'Board' | 'Staff' | 'Advisory';
    bio: string;
    imageSrc: string;
    linkedin?: string;
    affiliation?: string;
    department?: string;
};

export type PublicMilestone = {
    id: string;
    slug: string;
    year: string;
    title: string;
    description: string;
};

export type PublicDocument = {
    id: string;
    slug: string;
    title: string;
    year: number;
    category: 'Report' | 'Audit' | 'Legal';
    url: string;
    size: string;
};

export type PublicOrganization = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    website: string | null;
    logo_url: string | null;
    founded_date: string | null;
    city: string | null;
    country: string | null;
    mission?: string | null;
    vision?: string | null;
};

export type PublicFinancialSummary = {
    totalRevenue: number;
    donationCount: number;
    totalExpenses: number;
    programExpenses: number;
    managementExpenses: number;
    fundraisingExpenses: number;
    totalBudget: number;
    budgetCount: number;
    efficiencyRatio: number;
};

function validTeamCategory(raw: unknown): PublicTeamMember['category'] {
    if (raw === 'Leadership' || raw === 'Board' || raw === 'Staff' || raw === 'Advisory') return raw;
    if (typeof raw === 'string') {
        const lower = raw.toLowerCase();
        if (lower === 'leadership') return 'Leadership';
        if (lower === 'board') return 'Board';
        if (lower === 'advisory') return 'Advisory';
    }
    return 'Staff';
}

/**
 * Team members from the CMS (admin: content_pages, category = 'team_member').
 * Deduplicated by slug — admin slug is unique per org.
 */
export async function getPublicTeamMembers(limit = 50, locale = 'en'): Promise<{ data: PublicTeamMember[] | null; error: string | null }> {
    const { data, error } = await getPublicContentByCategory('team_member', limit, locale);
    if (error || !data) return { data: null, error };

    const seen = new Set<string>();
    const members: PublicTeamMember[] = [];
    for (const p of data) {
        if (seen.has(p.slug)) continue;
        seen.add(p.slug);
        const c = (p.content ?? {}) as Record<string, unknown>;
        const s = (k: string) => (typeof c[k] === 'string' && (c[k] as string).trim() ? ((c[k] as string).trim()) : undefined);
        members.push({
            id: p.id,
            slug: p.slug,
            name: s('name') ?? p.title,
            role: s('role') ?? s('position') ?? '',
            category: validTeamCategory(c.category_label ?? c.team_category ?? c.role_type ?? 'Staff'),
            bio: s('bio') ?? p.meta_description ?? '',
            imageSrc: s('image_src') ?? s('imageSrc') ?? p.cover_image_url ?? '',
            linkedin: s('linkedin'),
            affiliation: s('affiliation'),
            department: s('department'),
        });
    }

    // Stable order: optional content.order, Leadership first otherwise
    const rank: Record<string, number> = { Leadership: 0, Board: 1, Staff: 2, Advisory: 3 };
    members.sort((a, b) => (rank[a.category] ?? 9) - (rank[b.category] ?? 9));
    return { data: members, error: null };
}

/** History milestones from the CMS (admin: content_pages, category = 'milestone'). */
export async function getPublicMilestones(limit = 20, locale = 'en'): Promise<{ data: PublicMilestone[] | null; error: string | null }> {
    const { data, error } = await getPublicContentByCategory('milestone', limit, locale);
    if (error || !data) return { data: null, error };

    return {
        data: data.map((p) => {
            const c = (p.content ?? {}) as Record<string, unknown>;
            const year = typeof c.year === 'number' ? String(c.year) : typeof c.year === 'string' && c.year ? c.year : '';
            return {
                id: p.id,
                slug: p.slug,
                year,
                title: typeof c.title === 'string' && c.title ? c.title : p.title,
                description: typeof c.description === 'string' && c.description ? c.description : (p.meta_description ?? ''),
            };
        }).filter((m) => m.year && m.title),
        error: null,
    };
}

/** Transparency documents from the CMS (admin: content_pages, category = 'document'). */
export async function getPublicDocuments(limit = 30, locale = 'en'): Promise<{ data: PublicDocument[] | null; error: string | null }> {
    const { data, error } = await getPublicContentByCategory('document', limit, locale);
    if (error || !data) return { data: null, error };

    const valid = ['Report', 'Audit', 'Legal'] as const;
    return {
        data: data.map((p) => {
            const c = (p.content ?? {}) as Record<string, unknown>;
            const rawCat = typeof c.doc_category === 'string' ? c.doc_category : typeof c.docCategory === 'string' ? c.docCategory : 'Report';
            const category = (valid as readonly string[]).includes(rawCat) ? (rawCat as PublicDocument['category']) : 'Report';
            const publishedYear = p.published_at ? new Date(p.published_at).getFullYear() : new Date(p.created_at).getFullYear();
            const year = typeof c.year === 'number' && Number.isFinite(c.year) ? c.year : publishedYear;
            const url = typeof c.file_url === 'string' && c.file_url ? c.file_url : typeof c.url === 'string' && c.url ? c.url : '';
            return {
                id: p.id,
                slug: p.slug,
                title: p.title,
                year,
                category,
                url,
                size: typeof c.size === 'string' && c.size ? c.size : '',
            };
        }).filter((d) => d.url),
        error: null,
    };
}

export type ContentPreview = {
    id: string;
    title: string;
    slug: string;
    status: string;
    workflow_state: string;
    content: Record<string, unknown>;
    meta_title: string | null;
    meta_description: string | null;
    cover_image_url: string | null;
    published_at: string | null;
    updated_at: string;
    translations: Record<string, Record<string, unknown>>;
};

/**
 * Token-gated draft preview. No authentication — the unguessable
 * preview_token IS the credential. Invalid tokens return null
 * (callers render notFound()). Never indexed (route sets noindex).
 */
export async function getContentPreview(
    token: string,
): Promise<{ data: ContentPreview | null; error: string | null }> {
    if (!token || !/^[0-9a-f-]{36}$/i.test(token.trim())) {
        return { data: null, error: null };
    }
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('public_content_preview', { p_token: token.trim() });
    if (error) {
        console.error('[getContentPreview]', error.message);
        return { data: null, error: error.message };
    }
    if (!data) return { data: null, error: null };
    return { data: data as ContentPreview, error: null };
}

/** Public organization profile (admin: /admin/settings), localized. */
export async function getPublicOrganization(
    locale = 'en',
): Promise<{ data: PublicOrganization | null; error: string | null }> {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.from('public_organization').select('*').maybeSingle();
    if (error) {
        console.error('Error fetching public organization:', error);
        return { data: null, error: error.message };
    }
    if (!data) return { data: null, error: null };
    const org = data as PublicOrganization;
    const t = await fetchEntityRows(supabase, 'organization', [org.id]);
    const f = pickEntityFields(org.id, locale, t);
    if (!f) return { data: org, error: null };
    return {
        data: {
            ...org,
            name: strField(f, 'name') ?? org.name,
            description: strField(f, 'description') ?? org.description,
            mission: strField(f, 'mission') ?? null,
            vision: strField(f, 'vision') ?? null,
        },
        error: null,
    };
}

/** Aggregate financial transparency totals (no per-row exposure). */
export async function getPublicFinancialSummary(): Promise<{ data: PublicFinancialSummary | null; error: string | null }> {
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc('public_financial_summary');
    if (error) {
        console.error('Error fetching public financial summary:', error);
        return { data: null, error: error.message };
    }
    const s = (data ?? {}) as {
        total_revenue?: number; donation_count?: number; total_expenses?: number;
        program_expenses?: number; management_expenses?: number; fundraising_expenses?: number;
        total_budget?: number; budget_count?: number; efficiency_ratio?: number;
    };
    return {
        data: {
            totalRevenue: Number(s.total_revenue ?? 0),
            donationCount: Number(s.donation_count ?? 0),
            totalExpenses: Number(s.total_expenses ?? 0),
            programExpenses: Number(s.program_expenses ?? 0),
            managementExpenses: Number(s.management_expenses ?? 0),
            fundraisingExpenses: Number(s.fundraising_expenses ?? 0),
            totalBudget: Number(s.total_budget ?? 0),
            budgetCount: Number(s.budget_count ?? 0),
            efficiencyRatio: Number(s.efficiency_ratio ?? 0),
        },
        error: null,
    };
}

// =====================================================
// NEWS ARTICLES / IMPACT STORIES / VOLUNTEER ROLES
// Backed by dedicated public views (migration: news, stories
// and volunteer roles). Every reader degrades gracefully to an
// empty list when the migration has not been applied yet, so
// public pages always render instead of erroring.
// =====================================================

export type PublicNewsArticle = {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    content: string;
    cover_image_url: string | null;
    cover_alt_text: string | null;
    category: string | null;
    author_name: string | null;
    author_avatar_url: string | null;
    author_role: string | null;
    read_minutes: number | null;
    tags: string[];
    key_takeaways: string[];
    is_featured: boolean;
    published_at: string | null;
    created_at: string;
};

export type PublicImpactStory = {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    content: string;
    story_type: string;
    program: string | null;
    role: string | null;
    author_name: string | null;
    author_avatar_url: string | null;
    image_url: string | null;
    image_alt: string | null;
    media_url: string | null;
    transcript_url: string | null;
    duration_label: string | null;
    is_featured: boolean;
    timeline: Array<{ year: string; title: string; description: string }>;
    impact_stats: Array<{ label: string; value: string }>;
    published_at: string | null;
    created_at: string;
};

export async function getPublicNewsArticles(
    limit = 12,
): Promise<{ data: PublicNewsArticle[] | null; error: string | null }> {
    try {
        const supabase = createSupabasePublicClient();
        const { data, error } = await supabase
            .from('public_news_articles')
            .select('*')
            .order('is_featured', { ascending: false })
            .order('published_at', { ascending: false, nullsFirst: false })
            .limit(limit);
        if (error) {
            console.error('[getPublicNewsArticles]', error.message);
            return { data: null, error: error.message };
        }
        return { data: (data ?? []) as PublicNewsArticle[], error: null };
    } catch {
        // View not applied yet — render the empty state.
        return { data: [], error: null };
    }
}

export async function getPublicArticleBySlug(
    slug: string,
): Promise<{ data: PublicNewsArticle | null; error: string | null }> {
    try {
        const supabase = createSupabasePublicClient();
        const { data, error } = await supabase
            .from('public_news_articles')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();
        if (error) {
            console.error('[getPublicArticleBySlug]', error.message);
            return { data: null, error: error.message };
        }
        return { data: (data as PublicNewsArticle) ?? null, error: null };
    } catch {
        return { data: null, error: null };
    }
}

export async function getPublicImpactStories(
    limit = 24,
): Promise<{ data: PublicImpactStory[] | null; error: string | null }> {
    try {
        const supabase = createSupabasePublicClient();
        const { data, error } = await supabase
            .from('public_impact_stories')
            .select('*')
            .order('is_featured', { ascending: false })
            .order('published_at', { ascending: false, nullsFirst: false })
            .limit(limit);
        if (error) {
            console.error('[getPublicImpactStories]', error.message);
            return { data: null, error: error.message };
        }
        return { data: (data ?? []) as PublicImpactStory[], error: null };
    } catch {
        return { data: [], error: null };
    }
}

export async function getPublicImpactStoryBySlug(
    slug: string,
): Promise<{ data: PublicImpactStory | null; error: string | null }> {
    try {
        const supabase = createSupabasePublicClient();
        const { data, error } = await supabase
            .from('public_impact_stories')
            .select('*')
            .eq('slug', slug)
            .maybeSingle();
        if (error) {
            console.error('[getPublicImpactStoryBySlug]', error.message);
            return { data: null, error: error.message };
        }
        return { data: (data as PublicImpactStory) ?? null, error: null };
    } catch {
        return { data: null, error: null };
    }
}

export type PublicVolunteerRole = {
    id: string;
    title: string;
    description: string | null;
    location: string;
    work_type: string;
    category: string | null;
    commitment: string;
    is_urgent: boolean;
};

export async function getPublicVolunteerRoles(): Promise<{
    data: PublicVolunteerRole[] | null;
    error: string | null;
}> {
    try {
        const supabase = createSupabasePublicClient();
        const { data, error } = await supabase
            .from('public_volunteer_roles')
            .select('*')
            .order('is_urgent', { ascending: false })
            .order('created_at', { ascending: false });
        if (error) {
            console.error('[getPublicVolunteerRoles]', error.message);
            return { data: null, error: error.message };
        }
        return { data: (data ?? []) as PublicVolunteerRole[], error: null };
    } catch {
        return { data: [], error: null };
    }
}

export type PublicCategoryStats = {
    projectCount: number;
    beneficiariesReached: number;
    beneficiariesTarget: number;
    countries: number;
};

/**
 * Real per-category program stats computed from published projects
 * (replaces the former development-only placeholders).
 */
export async function getPublicCategoryStats(
    category: string,
): Promise<{ data: PublicCategoryStats | null; error: string | null }> {
    try {
        const supabase = createSupabasePublicClient();
        const { data, error } = await supabase
            .from('public_projects')
            .select('beneficiaries_reached, beneficiaries_target, country')
            .eq('category', category);
        if (error) {
            console.error('[getPublicCategoryStats]', error.message);
            return { data: null, error: error.message };
        }
        const rows = (data ?? []) as Array<{
            beneficiaries_reached: number;
            beneficiaries_target: number | null;
            country: string | null;
        }>;
        const countries = new Set(rows.map((r) => r.country).filter(Boolean));
        return {
            data: {
                projectCount: rows.length,
                beneficiariesReached: rows.reduce((sum, r) => sum + (r.beneficiaries_reached ?? 0), 0),
                beneficiariesTarget: rows.reduce((sum, r) => sum + (r.beneficiaries_target ?? 0), 0),
                countries: countries.size,
            },
            error: null,
        };
    } catch {
        return { data: null, error: null };
    }
}

// ---------------------------------------------------------------------------
// Sitemap helpers (slug + freshness only — safe for sitemap.xml)
// ---------------------------------------------------------------------------

export type PublicSlugEntry = { slug: string; updated_at: string | null; category?: string | null };

/**
 * Slug + freshness for sitemap generation. Selects `*` so the helper works
 * across views with differing timestamp columns (`public_events` has no
 * `published_at`), then picks the most meaningful date available.
 */
async function fetchSlugEntries(
    view: string,
): Promise<{ data: PublicSlugEntry[] | null; error: string | null }> {
    try {
        const supabase = createSupabasePublicClient();
        const { data, error } = await supabase.from(view).select('*');
        if (error) return { data: [], error: null };
        const rows = (data ?? []) as Array<Record<string, unknown>>;
        return {
            data: rows.flatMap((row) => {
                const slug = typeof row.slug === 'string' ? row.slug : null;
                if (!slug) return [];
                const stamp = row.published_at ?? row.updated_at ?? row.start_date ?? row.created_at;
                return [{
                    slug,
                    updated_at: typeof stamp === 'string' ? stamp : null,
                    category: typeof row.category === 'string' ? row.category : null,
                }];
            }),
            error: null,
        };
    } catch {
        return { data: [], error: null };
    }
}

export async function getPublicProjectSlugs() {
    return fetchSlugEntries('public_projects');
}
export async function getPublicEventSlugs() {
    return fetchSlugEntries('public_events');
}
export async function getPublicNewsSlugs() {
    return fetchSlugEntries('public_news_articles');
}
export async function getPublicImpactStorySlugs() {
    return fetchSlugEntries('public_impact_stories');
}
