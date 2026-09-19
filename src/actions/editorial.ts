'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import {
    revalidatePublicContentRoutes,
    revalidatePublicData,
    revalidatePublicVolunteerRoutes,
} from '@/lib/cache';
import { validateSlug } from '@/lib/content/slug';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
    ImpactStory,
    ImpactStoryInsert,
    ImpactStoryUpdate,
    NewsArticle,
    NewsArticleInsert,
    NewsArticleUpdate,
    VolunteerRole as VolunteerRoleRow,
    VolunteerRoleInsert,
    VolunteerRoleStatus,
    VolunteerRoleUpdate,
} from '@/types/domain/editorial';

/**
 * Admin CRUD for editorial content: news articles, impact stories and
 * volunteer roles.
 *
 * These populate the public `/news`, `/stories` and `/get-involved/volunteer`
 * surfaces (migration 25 adds the tables and their `public_*` views). Every
 * mutation purges both the cached anon reads (`revalidatePublicData`, invoked
 * inside the cache helpers) and the affected ISR routes for all locales.
 *
 * All reads/writes are organization-scoped twice: the query filters on
 * `organization_id` and RLS enforces the same predicate in the database.
 */

type ActionResult<T> = { data: T | null; error: string | null };

const NEWS_TABLE = 'news_articles';
const STORIES_TABLE = 'impact_stories';
const ROLES_TABLE = 'volunteer_roles';

/** Normalizes a slug and rejects reserved/invalid values before any write. */
function prepareSlug(slug: string): { slug: string | null; error: string | null } {
    const normalized = slug.trim().toLowerCase();
    const validity = validateSlug(normalized);
    if (!validity.ok) return { slug: null, error: validity.error ?? 'Invalid slug.' };
    return { slug: normalized, error: null };
}

/** Non-empty trimmed string, else null (avoids storing `"   "` in the DB). */
function cleanText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function cleanList(value: string[] | undefined): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((v) => v.trim()).filter((v) => v.length > 0);
}

/**
 * Shared slug-uniqueness check. Scoped to the active organization so two
 * tenants can both own `/news/annual-report`.
 */
async function slugIsTaken(
    supabase: SupabaseClient,
    table: string,
    organizationId: string,
    slug: string,
    excludeId?: string,
): Promise<boolean> {
    let query = supabase
        .from(table)
        .select('id')
        .eq('organization_id', organizationId)
        .eq('slug', slug)
        .limit(1);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    return Boolean(data);
}

/** Suggests `slug-2`, `slug-3`… so the admin form never dead-ends on a clash. */
async function nextAvailableSlug(
    supabase: SupabaseClient,
    table: string,
    organizationId: string,
    base: string,
): Promise<string> {
    for (let i = 2; i <= 50; i += 1) {
        const candidate = `${base}-${i}`;
        if (!(await slugIsTaken(supabase, table, organizationId, candidate))) return candidate;
    }
    return `${base}-${Date.now()}`;
}

/**
 * Invalidate both public layers after an editorial write:
 *   1. the tagged anon DB reads (Data Cache), and
 *   2. the ISR route payloads for every locale.
 * Skipping either leaves stale content on the live site for up to
 * `PUBLIC_REVALIDATE_SECONDS`.
 */
function purgePublicContent(): void {
    revalidatePublicData();
    revalidatePublicContentRoutes();
}

function purgePublicVolunteers(): void {
    revalidatePublicData();
    revalidatePublicVolunteerRoutes();
}

// ===========================================================================
// NEWS ARTICLES
// ===========================================================================

/** List news articles for the active organization (newest first). */
export async function getNewsArticles(): Promise<ActionResult<NewsArticle[]>> {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(NEWS_TABLE)
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[getNewsArticles]', error.message);
        return { data: null, error: 'Unable to load news articles. Please try again.' };
    }
    return { data: (data ?? []) as NewsArticle[], error: null };
}

/** Single news article by id, scoped to the active organization. */
export async function getNewsArticle(id: string): Promise<ActionResult<NewsArticle>> {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(NEWS_TABLE)
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'News article not found.' };
    return { data: data as NewsArticle, error: null };
}

/** Live slug check for the article form (auto-suffixes on collision). */
export async function checkNewsSlugAvailable(slug: string, excludeId?: string) {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) return { available: false, suggestion: null, error: auth.error };

    const prepared = prepareSlug(slug);
    if (prepared.error || !prepared.slug) {
        return { available: false, suggestion: null, error: prepared.error };
    }

    const taken = await slugIsTaken(
        auth.context.supabase, NEWS_TABLE, auth.organizationId, prepared.slug, excludeId,
    );
    if (!taken) return { available: true, suggestion: null, error: null };

    return {
        available: false,
        suggestion: await nextAvailableSlug(
            auth.context.supabase, NEWS_TABLE, auth.organizationId, prepared.slug,
        ),
        error: 'This slug is already in use. Pick a different one.',
    };
}

/** Create a news article (always starts as a draft). */
export async function createNewsArticle(
    input: Omit<NewsArticleInsert, 'organization_id' | 'created_by'>,
): Promise<ActionResult<NewsArticle>> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const title = cleanText(input.title);
    if (!title) return { data: null, error: 'Title is required.' };

    const prepared = prepareSlug(input.slug);
    if (prepared.error || !prepared.slug) return { data: null, error: prepared.error };

    const slug = (await slugIsTaken(
        auth.context.supabase, NEWS_TABLE, auth.organizationId, prepared.slug,
    ))
        ? await nextAvailableSlug(
            auth.context.supabase, NEWS_TABLE, auth.organizationId, prepared.slug,
        )
        : prepared.slug;

    const { data, error } = await auth.context.supabase
        .from(NEWS_TABLE)
        .insert({
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
            title,
            slug,
            excerpt: cleanText(input.excerpt),
            content: input.content ?? '',
            cover_image_url: cleanText(input.cover_image_url),
            cover_alt_text: cleanText(input.cover_alt_text),
            category: cleanText(input.category),
            author_name: cleanText(input.author_name),
            author_role: cleanText(input.author_role),
            read_minutes: input.read_minutes ?? null,
            tags: cleanList(input.tags),
            key_takeaways: cleanList(input.key_takeaways),
            is_featured: input.is_featured ?? false,
            // Drafts are never publicly visible; publish action sets the date.
            status: 'draft',
            published_at: null,
        })
        .select('*')
        .single();

    if (error || !data) {
        console.error('[createNewsArticle]', error?.message);
        return { data: null, error: 'Unable to create the article. Please try again.' };
    }

    revalidatePath('/admin/content');
    return { data: data as NewsArticle, error: null };
}

/** Update a news article's editable fields. */
export async function updateNewsArticle(
    id: string,
    input: NewsArticleUpdate,
): Promise<ActionResult<NewsArticle>> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.title !== undefined) {
        const title = cleanText(input.title);
        if (!title) return { data: null, error: 'Title is required.' };
        patch.title = title;
    }

    if (input.slug !== undefined) {
        const prepared = prepareSlug(input.slug);
        if (prepared.error || !prepared.slug) return { data: null, error: prepared.error };
        if (await slugIsTaken(
            auth.context.supabase, NEWS_TABLE, auth.organizationId, prepared.slug, id,
        )) {
            return { data: null, error: 'This slug is already in use. Pick a different one.' };
        }
        patch.slug = prepared.slug;
    }

    if (input.excerpt !== undefined) patch.excerpt = cleanText(input.excerpt);
    if (input.content !== undefined) patch.content = input.content;
    if (input.cover_image_url !== undefined) patch.cover_image_url = cleanText(input.cover_image_url);
    if (input.cover_alt_text !== undefined) patch.cover_alt_text = cleanText(input.cover_alt_text);
    if (input.category !== undefined) patch.category = cleanText(input.category);
    if (input.author_name !== undefined) patch.author_name = cleanText(input.author_name);
    if (input.author_role !== undefined) patch.author_role = cleanText(input.author_role);
    if (input.read_minutes !== undefined) patch.read_minutes = input.read_minutes ?? null;
    if (input.tags !== undefined) patch.tags = cleanList(input.tags);
    if (input.key_takeaways !== undefined) patch.key_takeaways = cleanList(input.key_takeaways);
    if (input.is_featured !== undefined) patch.is_featured = input.is_featured;

    const { data, error } = await auth.context.supabase
        .from(NEWS_TABLE)
        .update(patch)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .maybeSingle();

    if (error) {
        console.error('[updateNewsArticle]', error.message);
        return { data: null, error: 'Unable to save the article. Please try again.' };
    }
    if (!data) return { data: null, error: 'News article not found.' };

    revalidatePath('/admin/content');
    if ((data as NewsArticle).status === 'published') purgePublicContent();
    return { data: data as NewsArticle, error: null };
}

/**
 * Publish or unpublish an article. Publishing requires content.publish
 * (author cannot self-approve) and stamps `published_at` on first release
 * so ordering stays stable across re-publishes.
 */
export async function setNewsArticlePublished(
    id: string,
    publish: boolean,
): Promise<ActionResult<NewsArticle>> {
    const auth = await authorizePermission(PERMISSIONS.content.publish);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: current, error: readError } = await auth.context.supabase
        .from(NEWS_TABLE)
        .select('id, status, published_at')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (readError) {
        console.error('[setNewsArticlePublished]', readError.message);
        return { data: null, error: 'Unable to update the article. Please try again.' };
    }
    if (!current) return { data: null, error: 'News article not found.' };

    const existing = current as { status: string; published_at: string | null };

    const { data, error } = await auth.context.supabase
        .from(NEWS_TABLE)
        .update({
            status: publish ? 'published' : 'draft',
            published_at: publish
                ? (existing.published_at ?? new Date().toISOString())
                : null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .maybeSingle();

    if (error) {
        console.error('[setNewsArticlePublished]', error.message);
        return { data: null, error: 'Unable to update the article. Please try again.' };
    }
    if (!data) return { data: null, error: 'News article not found.' };

    revalidatePath('/admin/content');
    purgePublicContent();
    return { data: data as NewsArticle, error: null };
}

/** Archive an article (hidden from the public site, kept for history). */
export async function archiveNewsArticle(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(NEWS_TABLE)
        .update({
            status: 'archived',
            published_at: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[archiveNewsArticle]', error.message);
        return { error: 'Unable to archive the article. Please try again.' };
    }
    if (!data) return { error: 'News article not found.' };

    revalidatePath('/admin/content');
    purgePublicContent();
    return { error: null };
}

/** Permanently delete an article (organization-scoped). */
export async function deleteNewsArticle(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(NEWS_TABLE)
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteNewsArticle]', error.message);
        return { error: 'Unable to delete the article. Please try again.' };
    }
    if (!data) return { error: 'News article not found.' };

    revalidatePath('/admin/content');
    purgePublicContent();
    return { error: null };
}

// ===========================================================================
// VOLUNTEER ROLES
// ===========================================================================

/** List volunteer roles for the active organization (urgent first). */
export async function getVolunteerRoles(): Promise<ActionResult<VolunteerRoleRow[]>> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(ROLES_TABLE)
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('is_urgent', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[getVolunteerRoles]', error.message);
        return { data: null, error: 'Unable to load volunteer roles.' };
    }
    return { data: (data ?? []) as VolunteerRoleRow[], error: null };
}

/** Read one volunteer role by id. */
export async function getVolunteerRole(id: string): Promise<ActionResult<VolunteerRoleRow>> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(ROLES_TABLE)
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Volunteer role not found.' };
    return { data: data as VolunteerRoleRow, error: null };
}

/** Live slug check for the volunteer role form. */
export async function checkVolunteerRoleSlugAvailable(slug: string, excludeId?: string) {
    const auth = await authorizePermission(PERMISSIONS.volunteers.read);
    if (!auth.ok) return { available: false, suggestion: null, error: auth.error };

    const prepared = prepareSlug(slug);
    if (prepared.error || !prepared.slug) {
        return { available: false, suggestion: null, error: prepared.error };
    }

    const taken = await slugIsTaken(
        auth.context.supabase, ROLES_TABLE, auth.organizationId, prepared.slug, excludeId,
    );
    if (!taken) return { available: true, suggestion: null, error: null };

    return {
        available: false,
        suggestion: await nextAvailableSlug(
            auth.context.supabase, ROLES_TABLE, auth.organizationId, prepared.slug,
        ),
        error: 'This slug is already in use. Pick a different one.',
    };
}

/** Create a volunteer role. Starts as a draft so nothing is published by accident. */
export async function createVolunteerRole(
    input: Omit<VolunteerRoleInsert, 'organization_id' | 'created_by'>,
): Promise<ActionResult<VolunteerRoleRow>> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const title = cleanText(input.title);
    if (!title) return { data: null, error: 'Title is required.' };

    const prepared = prepareSlug(input.slug);
    if (prepared.error || !prepared.slug) return { data: null, error: prepared.error };

    const slug = (await slugIsTaken(
        auth.context.supabase, ROLES_TABLE, auth.organizationId, prepared.slug,
    ))
        ? await nextAvailableSlug(
            auth.context.supabase, ROLES_TABLE, auth.organizationId, prepared.slug,
        )
        : prepared.slug;

    const { data, error } = await auth.context.supabase
        .from(ROLES_TABLE)
        .insert({
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
            title,
            slug,
            description: cleanText(input.description),
            location: cleanText(input.location) ?? 'Remote',
            work_type: input.work_type ?? 'onsite',
            category: cleanText(input.category),
            commitment: cleanText(input.commitment) ?? 'Flexible',
            responsibilities: cleanList(input.responsibilities),
            requirements: cleanList(input.requirements),
            openings: input.openings ?? 1,
            is_urgent: input.is_urgent ?? false,
            status: 'draft',
            published_at: null,
        })
        .select('*')
        .single();

    if (error || !data) {
        console.error('[createVolunteerRole]', error?.message);
        return { data: null, error: 'Unable to create the role. Please try again.' };
    }

    revalidatePath('/admin/volunteers');
    return { data: data as VolunteerRoleRow, error: null };
}

// ===========================================================================
// IMPACT STORIES
// ===========================================================================

/** List impact stories for the active organization (newest first). */
export async function getImpactStories(): Promise<ActionResult<ImpactStory[]>> {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(STORIES_TABLE)
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[getImpactStories]', error.message);
        return { data: null, error: 'Unable to load impact stories. Please try again.' };
    }
    return { data: (data ?? []) as ImpactStory[], error: null };
}

/** Single impact story by id, scoped to the active organization. */
export async function getImpactStory(id: string): Promise<ActionResult<ImpactStory>> {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(STORIES_TABLE)
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Impact story not found.' };
    return { data: data as ImpactStory, error: null };
}

/** Live slug check for the story form. */
export async function checkStorySlugAvailable(slug: string, excludeId?: string) {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) return { available: false, suggestion: null, error: auth.error };

    const prepared = prepareSlug(slug);
    if (prepared.error || !prepared.slug) {
        return { available: false, suggestion: null, error: prepared.error };
    }

    const taken = await slugIsTaken(
        auth.context.supabase, STORIES_TABLE, auth.organizationId, prepared.slug, excludeId,
    );
    if (!taken) return { available: true, suggestion: null, error: null };

    return {
        available: false,
        suggestion: await nextAvailableSlug(
            auth.context.supabase, STORIES_TABLE, auth.organizationId, prepared.slug,
        ),
        error: 'This slug is already in use. Pick a different one.',
    };
}

/**
 * Create an impact story. Starts as a draft; `consent_obtained` defaults to
 * false because stories about real people must never be published without a
 * recorded release.
 */
export async function createImpactStory(
    input: Omit<ImpactStoryInsert, 'organization_id' | 'created_by'>,
): Promise<ActionResult<ImpactStory>> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const title = cleanText(input.title);
    if (!title) return { data: null, error: 'Title is required.' };

    const prepared = prepareSlug(input.slug);
    if (prepared.error || !prepared.slug) return { data: null, error: prepared.error };

    const slug = (await slugIsTaken(
        auth.context.supabase, STORIES_TABLE, auth.organizationId, prepared.slug,
    ))
        ? await nextAvailableSlug(
            auth.context.supabase, STORIES_TABLE, auth.organizationId, prepared.slug,
        )
        : prepared.slug;

    const { data, error } = await auth.context.supabase
        .from(STORIES_TABLE)
        .insert({
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
            title,
            slug,
            summary: cleanText(input.summary),
            content: input.content ?? '',
            story_type: input.story_type ?? 'article',
            program: cleanText(input.program),
            subject_role: input.subject_role ?? 'beneficiary',
            author_name: cleanText(input.author_name),
            author_avatar_url: cleanText(input.author_avatar_url),
            image_url: cleanText(input.image_url),
            image_alt: cleanText(input.image_alt),
            media_url: cleanText(input.media_url),
            transcript_url: cleanText(input.transcript_url),
            duration_label: cleanText(input.duration_label),
            timeline: input.timeline ?? [],
            impact_stats: input.impact_stats ?? [],
            consent_obtained: input.consent_obtained ?? false,
            is_featured: input.is_featured ?? false,
            status: 'draft',
            published_at: null,
        })
        .select('*')
        .single();

    if (error || !data) {
        console.error('[createImpactStory]', error?.message);
        return { data: null, error: 'Unable to create the story. Please try again.' };
    }

    revalidatePath('/admin/content');
    return { data: data as ImpactStory, error: null };
}

/**
 * Update an impact story. Only the provided keys are patched, so partial
 * saves from the editor never blank untouched fields.
 */
export async function updateImpactStory(
    id: string,
    input: ImpactStoryUpdate,
): Promise<ActionResult<ImpactStory>> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.title !== undefined) {
        const title = cleanText(input.title);
        if (!title) return { data: null, error: 'Title is required.' };
        patch.title = title;
    }

    if (input.slug !== undefined) {
        const prepared = prepareSlug(input.slug);
        if (prepared.error || !prepared.slug) return { data: null, error: prepared.error };
        if (await slugIsTaken(
            auth.context.supabase, STORIES_TABLE, auth.organizationId, prepared.slug, id,
        )) {
            return { data: null, error: 'This slug is already in use. Pick a different one.' };
        }
        patch.slug = prepared.slug;
    }

    if (input.summary !== undefined) patch.summary = cleanText(input.summary);
    if (input.content !== undefined) patch.content = input.content;
    if (input.story_type !== undefined) patch.story_type = input.story_type;
    if (input.program !== undefined) patch.program = cleanText(input.program);
    if (input.subject_role !== undefined) patch.subject_role = input.subject_role;
    if (input.author_name !== undefined) patch.author_name = cleanText(input.author_name);
    if (input.author_avatar_url !== undefined) patch.author_avatar_url = cleanText(input.author_avatar_url);
    if (input.image_url !== undefined) patch.image_url = cleanText(input.image_url);
    if (input.image_alt !== undefined) patch.image_alt = cleanText(input.image_alt);
    if (input.media_url !== undefined) patch.media_url = cleanText(input.media_url);
    if (input.transcript_url !== undefined) patch.transcript_url = cleanText(input.transcript_url);
    if (input.duration_label !== undefined) patch.duration_label = cleanText(input.duration_label);
    if (input.timeline !== undefined) patch.timeline = input.timeline;
    if (input.impact_stats !== undefined) patch.impact_stats = input.impact_stats;
    if (input.consent_obtained !== undefined) patch.consent_obtained = input.consent_obtained;
    if (input.is_featured !== undefined) patch.is_featured = input.is_featured;

    const { data, error } = await auth.context.supabase
        .from(STORIES_TABLE)
        .update(patch)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .maybeSingle();

    if (error) {
        console.error('[updateImpactStory]', error.message);
        return { data: null, error: 'Unable to save the story. Please try again.' };
    }
    if (!data) return { data: null, error: 'Impact story not found.' };

    revalidatePath('/admin/content');
    if ((data as ImpactStory).status === 'published') purgePublicContent();
    return { data: data as ImpactStory, error: null };
}

/**
 * Publish or unpublish a story.
 *
 * Requires `content.manage` (not just `content.publish`): a story names a real
 * person, so the consent flag is re-checked here at the moment of release
 * rather than trusted from whenever the draft was last saved.
 */
export async function setImpactStoryPublished(
    id: string,
    publish: boolean,
): Promise<ActionResult<ImpactStory>> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: current, error: readError } = await auth.context.supabase
        .from(STORIES_TABLE)
        .select('id, consent_obtained, published_at')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (readError) {
        console.error('[setImpactStoryPublished]', readError.message);
        return { data: null, error: 'Unable to update the story. Please try again.' };
    }
    if (!current) return { data: null, error: 'Impact story not found.' };

    const existing = current as { consent_obtained: boolean; published_at: string | null };

    if (publish && !existing.consent_obtained) {
        return {
            data: null,
            error: 'Record consent from the story subject before publishing.',
        };
    }

    const { data, error } = await auth.context.supabase
        .from(STORIES_TABLE)
        .update({
            status: publish ? 'published' : 'draft',
            published_at: publish
                ? (existing.published_at ?? new Date().toISOString())
                : null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .maybeSingle();

    if (error) {
        console.error('[setImpactStoryPublished]', error.message);
        return { data: null, error: 'Unable to update the story. Please try again.' };
    }
    if (!data) return { data: null, error: 'Impact story not found.' };

    revalidatePath('/admin/content');
    purgePublicContent();
    return { data: data as ImpactStory, error: null };
}

/** Archive a story (hidden from the public site, kept for history). */
export async function archiveImpactStory(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(STORIES_TABLE)
        .update({
            status: 'archived',
            published_at: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[archiveImpactStory]', error.message);
        return { error: 'Unable to archive the story. Please try again.' };
    }
    if (!data) return { error: 'Impact story not found.' };

    revalidatePath('/admin/content');
    purgePublicContent();
    return { error: null };
}

/** Permanently delete a story (organization-scoped). */
export async function deleteImpactStory(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(STORIES_TABLE)
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteImpactStory]', error.message);
        return { error: 'Unable to delete the story. Please try again.' };
    }
    if (!data) return { error: 'Impact story not found.' };

    revalidatePath('/admin/content');
    purgePublicContent();
    return { error: null };
}
// ===========================================================================
// VOLUNTEER ROLES (mutations)
// ===========================================================================

/**
 * Update a volunteer role. Only the provided keys are patched.
 * `published_at` is never touched here — publishing is a deliberate act
 * handled by `setVolunteerRoleStatus`.
 */
export async function updateVolunteerRole(
    id: string,
    input: VolunteerRoleUpdate,
): Promise<ActionResult<VolunteerRoleRow>> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.title !== undefined) {
        const title = cleanText(input.title);
        if (!title) return { data: null, error: 'Title is required.' };
        patch.title = title;
    }

    if (input.slug !== undefined) {
        const prepared = prepareSlug(input.slug);
        if (prepared.error || !prepared.slug) return { data: null, error: prepared.error };
        if (await slugIsTaken(
            auth.context.supabase, ROLES_TABLE, auth.organizationId, prepared.slug, id,
        )) {
            return { data: null, error: 'This slug is already in use. Pick a different one.' };
        }
        patch.slug = prepared.slug;
    }

    if (input.description !== undefined) patch.description = cleanText(input.description);
    if (input.location !== undefined) patch.location = cleanText(input.location) ?? 'Remote';
    if (input.work_type !== undefined) patch.work_type = input.work_type;
    if (input.category !== undefined) patch.category = cleanText(input.category);
    if (input.commitment !== undefined) patch.commitment = cleanText(input.commitment) ?? 'Flexible';
    if (input.responsibilities !== undefined) patch.responsibilities = cleanList(input.responsibilities);
    if (input.requirements !== undefined) patch.requirements = cleanList(input.requirements);
    if (input.openings !== undefined) patch.openings = Math.max(1, input.openings);
    if (input.is_urgent !== undefined) patch.is_urgent = input.is_urgent;

    const { data, error } = await auth.context.supabase
        .from(ROLES_TABLE)
        .update(patch)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .maybeSingle();

    if (error) {
        console.error('[updateVolunteerRole]', error.message);
        return { data: null, error: 'Unable to save the role. Please try again.' };
    }
    if (!data) return { data: null, error: 'Volunteer role not found.' };

    revalidatePath('/admin/volunteers');
    if ((data as VolunteerRoleRow).status === 'open') purgePublicVolunteers();
    return { data: data as VolunteerRoleRow, error: null };
}

/**
 * Move a role between draft/open/closed. `open` is the only status the
 * public view exposes, so every transition purges the cached board.
 */
export async function setVolunteerRoleStatus(
    id: string,
    status: VolunteerRoleStatus,
): Promise<ActionResult<VolunteerRoleRow>> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: current, error: readError } = await auth.context.supabase
        .from(ROLES_TABLE)
        .select('id, published_at')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (readError) {
        console.error('[setVolunteerRoleStatus]', readError.message);
        return { data: null, error: 'Unable to update the role. Please try again.' };
    }
    if (!current) return { data: null, error: 'Volunteer role not found.' };

    const existing = current as { published_at: string | null };

    const { data, error } = await auth.context.supabase
        .from(ROLES_TABLE)
        .update({
            status,
            published_at: status === 'open'
                ? (existing.published_at ?? new Date().toISOString())
                : null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .maybeSingle();

    if (error) {
        console.error('[setVolunteerRoleStatus]', error.message);
        return { data: null, error: 'Unable to update the role. Please try again.' };
    }
    if (!data) return { data: null, error: 'Volunteer role not found.' };

    revalidatePath('/admin/volunteers');
    purgePublicVolunteers();
    return { data: data as VolunteerRoleRow, error: null };
}

/** Permanently delete a volunteer role (organization-scoped). */
export async function deleteVolunteerRole(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.volunteers.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(ROLES_TABLE)
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteVolunteerRole]', error.message);
        return { error: 'Unable to delete the role. Please try again.' };
    }
    if (!data) return { error: 'Volunteer role not found.' };

    revalidatePath('/admin/volunteers');
    purgePublicVolunteers();
    return { error: null };
}