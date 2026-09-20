'use server';

import { revalidatePath } from 'next/cache';
import { revalidatePublicContentRoutes } from '@/lib/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { ContentPage, ContentPageInsert, ContentPageUpdate } from '@/types/domain/content';

const TABLE = 'content_pages';

/** Get all content pages for the active organization. */
export async function getContentPages(): Promise<{ data: ContentPage[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load content pages. Please try again.' };
    return { data, error: null };
}

/** Get a single content page by ID (scoped to the active organization). */
export async function getContentPage(id: string): Promise<{ data: ContentPage | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (error || !data) return { data: null, error: 'Content page not found.' };
    return { data, error: null };
}

/** Live slug-availability check for the editor (excludes the page being edited). */
export async function checkSlugAvailable(slug: string, excludeId?: string) {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) return { available: false, error: auth.error };

    const { validateSlug } = await import('@/lib/content/slug');
    const validity = validateSlug(slug);
    if (!validity.ok) return { available: false, error: validity.error ?? 'Invalid slug.' };

    let query = auth.context.supabase
        .from(TABLE)
        .select('id')
        .eq('slug', slug.trim())
        .eq('organization_id', auth.organizationId)
        .limit(1);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    if (data) return { available: false, error: 'This slug is already in use. Pick a different one.' };
    return { available: true, error: null };
}

/** Create a content page (starts as draft). */
export async function createContentPage(input: Omit<ContentPageInsert, 'organization_id'>): Promise<{ data: ContentPage | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { validateSlug, normalizeSlug } = await import('@/lib/content/slug');
    const slug = normalizeSlug(input.slug);
    const validity = validateSlug(slug);
    if (!validity.ok) return { data: null, error: validity.error ?? 'Invalid slug.' };
    if (!input.title.trim()) return { data: null, error: 'Title is required.' };
    if (typeof input.content !== 'object' || input.content === null || Array.isArray(input.content)) {
        return { data: null, error: 'Content must be an object.' };
    }

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .insert({
            ...input,
            slug,
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
            status: input.status ?? 'draft',
        })
        .select()
        .single();

    if (error) {
        console.error('[createContentPage]', error.message);
        if (error.code === '23505' || /duplicate|unique/i.test(error.message)) {
            return { data: null, error: 'This slug is already in use. Pick a different one.' };
        }
        return { data: null, error: 'Unable to create content page. Please check the provided data.' };
    }

    revalidatePath('/admin/content');
    return { data, error: null };
}

/** Snapshot the current row into content_page_revisions (best-effort, never blocks saves). */
async function snapshotPageRevision(
    supabase: import('@supabase/supabase-js').SupabaseClient,
    page: {
        id: string;
        organization_id: string;
        title: string;
        slug: string;
        status: string;
        workflow_state?: string | null;
        content: unknown;
        meta_title: string | null;
        meta_description: string | null;
        cover_image_url: string | null;
    },
    userId: string,
) {
    try {
        await supabase.from('content_page_revisions').insert({
            organization_id: page.organization_id,
            page_id: page.id,
            title: page.title,
            slug: page.slug,
            status: page.status,
            workflow_state: page.workflow_state ?? 'draft',
            content: (page.content ?? {}) as Record<string, unknown>,
            meta_title: page.meta_title,
            meta_description: page.meta_description,
            cover_image_url: page.cover_image_url,
            created_by: userId,
        });
    } catch (err) {
        console.error('[snapshotPageRevision]', err);
    }
}

/** Update a content page (organization-scoped; publishing is a separate action). */
export async function updateContentPage(id: string, input: ContentPageUpdate): Promise<{ data: ContentPage | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a content page.' };
    }

    // Publishing requires the dedicated permission — strip it from generic updates.
    const { status: _ignoredStatus, published_at: _ignoredPublishedAt, preview_token: _ignoredToken, ...rest } = input;

    if (rest.slug !== undefined) {
        const { validateSlug, normalizeSlug } = await import('@/lib/content/slug');
        const slug = normalizeSlug(rest.slug);
        const validity = validateSlug(slug);
        if (!validity.ok) return { data: null, error: validity.error ?? 'Invalid slug.' };
        rest.slug = slug;
    }
    if (rest.title !== undefined && !rest.title.trim()) {
        return { data: null, error: 'Title is required.' };
    }
    if (rest.content !== undefined && (typeof rest.content !== 'object' || rest.content === null || Array.isArray(rest.content))) {
        return { data: null, error: 'Content must be an object.' };
    }

    // Snapshot current state for revision history before overwriting.
    const { data: current } = await auth.context.supabase
        .from(TABLE)
        .select('id, organization_id, title, slug, status, workflow_state, content, meta_title, meta_description, cover_image_url')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!current) return { data: null, error: 'Content page not found.' };
    await snapshotPageRevision(auth.context.supabase, current as Parameters<typeof snapshotPageRevision>[1], auth.context.userId);

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .update(rest)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateContentPage]', error.message);
        if (error.code === '23505' || /duplicate|unique/i.test(error.message)) {
            return { data: null, error: 'This slug is already in use. Pick a different one.' };
        }
        return { data: null, error: 'Unable to update content page. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Content page not found.' };

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/${id}`);
    revalidatePublicContentRoutes();
    return { data, error: null };
}

/**
 * Archive a content page (soft-remove from public + listings).
 * Archived pages are excluded from the sitemap and public views.
 * Requires content.manage. Reversible via the workflow transition.
 */
export async function archiveContentPage(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { error: auth.error };

    const { data: current } = await auth.context.supabase
        .from(TABLE)
        .select('id, organization_id, title, slug, status, workflow_state, content, meta_title, meta_description, cover_image_url')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!current) return { error: 'Content page not found.' };
    await snapshotPageRevision(auth.context.supabase, current as Parameters<typeof snapshotPageRevision>[1], auth.context.userId);

    const { error } = await auth.context.supabase
        .from(TABLE)
        .update({ status: 'archived', workflow_state: 'archived', published_at: null })
        .eq('id', id)
        .eq('organization_id', auth.organizationId);

    if (error) {
        console.error('[archiveContentPage]', error.message);
        return { error: 'Unable to archive content page. Please try again.' };
    }
    revalidatePath('/admin/content');
    revalidatePath('/', 'layout');
    revalidatePublicContentRoutes();
    return { error: null };
}

/** Delete a content page (organization-scoped). */
export async function deleteContentPage(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteContentPage]', error.message);
        return { error: 'Unable to delete content page. Please try again.' };
    }
    if (!data) return { error: 'Content page not found.' };

    revalidatePath('/admin/content');
    revalidatePublicContentRoutes();
    return { error: null };
}

/**
 * Publish a content page. Requires the dedicated `content.publish`
 * permission (owner/admin only) — generic editors cannot publish.
 */
export async function publishContent(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.publish);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[publishContent]', error.message);
        return { error: 'Unable to publish content page. Please try again.' };
    }
    if (!data) return { error: 'Content page not found.' };

    revalidatePath('/admin/content');
    revalidatePath('/', 'layout');
    revalidatePublicContentRoutes();
    return { error: null };
}

/** Unpublish a content page (returns it to draft). Requires `content.publish`. */
export async function unpublishContent(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.content.publish);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .update({ status: 'draft', published_at: null })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[unpublishContent]', error.message);
        return { error: 'Unable to unpublish content page. Please try again.' };
    }
    if (!data) return { error: 'Content page not found.' };

    revalidatePath('/admin/content');
    revalidatePath('/', 'layout');
    revalidatePublicContentRoutes();
    return { error: null };
}

// =====================================================================
// Localization + approval workflow (migration 20240101000022)
// =====================================================================

import {
    canTransitionWorkflow,
    canPublishLocale,
    localeContentSchema,
    type ContentWorkflowState,
} from '@/lib/content/translations';
import { isSupportedLocale } from '@/lib/i18n/locales';

const TRANSLATIONS_TABLE = 'content_page_translations';
const APPROVALS_TABLE = 'governance_approvals';
const REVISIONS_TABLE = 'content_page_revisions';

/** Revision history for a page (newest first). Requires content.read. */
export async function getPageRevisions(pageId: string, limit = 20) {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(REVISIONS_TABLE)
        .select('id, title, slug, status, workflow_state, updated_at, created_at, created_by')
        .eq('page_id', pageId)
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 50));

    if (error) {
        console.error('[getPageRevisions]', error.message);
        return { data: [], error: null };
    }
    return { data: data ?? [], error: null };
}

/**
 * Restore a previous revision (copies the snapshot back onto the page,
 * snapshotting the current state first so restore is itself reversible).
 * Requires content.manage. Never changes status/workflow — restore is
 * content-only; publishing stays a separate approved step.
 */
export async function restorePageRevision(pageId: string, revisionId: string) {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: revision } = await auth.context.supabase
        .from(REVISIONS_TABLE)
        .select('*')
        .eq('id', revisionId)
        .eq('page_id', pageId)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!revision) return { data: null, error: 'Revision not found.' };

    const { data: current } = await auth.context.supabase
        .from(TABLE)
        .select('id, organization_id, title, slug, status, workflow_state, content, meta_title, meta_description, cover_image_url')
        .eq('id', pageId)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!current) return { data: null, error: 'Content page not found.' };
    await snapshotPageRevision(auth.context.supabase, current as Parameters<typeof snapshotPageRevision>[1], auth.context.userId);

    const rev = revision as {
        title: string;
        content: Record<string, unknown>;
        meta_title: string | null;
        meta_description: string | null;
        cover_image_url: string | null;
    };
    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .update({
            title: rev.title,
            content: rev.content ?? {},
            meta_title: rev.meta_title,
            meta_description: rev.meta_description,
            cover_image_url: rev.cover_image_url,
        })
        .eq('id', pageId)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[restorePageRevision]', error.message);
        return { data: null, error: 'Unable to restore revision. Please try again.' };
    }

    revalidatePath('/admin/content');
    revalidatePath(`/admin/content/${pageId}`);
    return { data, error: null };
}

/**
 * Rotate the draft-preview token (invalidates the old preview link).
 * Requires content.manage.
 */
export async function rotatePreviewToken(pageId: string) {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TABLE)
        .update({ preview_token: crypto.randomUUID() })
        .eq('id', pageId)
        .eq('organization_id', auth.organizationId)
        .select('preview_token')
        .maybeSingle();

    if (error || !data) {
        console.error('[rotatePreviewToken]', error?.message);
        return { data: null, error: 'Unable to rotate preview link. Please try again.' };
    }
    revalidatePath(`/admin/content/${pageId}`);
    return { data, error: null };
}

/** List per-locale translation rows for a page (org-scoped). */
export async function getPageTranslations(pageId: string) {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(TRANSLATIONS_TABLE)
        .select('*')
        .eq('page_id', pageId)
        .eq('organization_id', auth.organizationId)
        .order('locale', { ascending: true });

    if (error) {
        // Table missing (migration not yet applied) -> honest empty, not fake data.
        console.error('[getPageTranslations]', error.message);
        return { data: [], error: null };
    }
    return { data: data ?? [], error: null };
}

/** Upsert one locale's translation. Requires content.manage; publishing is separate. */
export async function upsertPageTranslation(
    pageId: string,
    locale: string,
    input: {
        title: string;
        content?: Record<string, unknown>;
        meta_title?: string | null;
        meta_description?: string | null;
        cover_image_url?: string | null;
        cover_alt_text?: string | null;
        cta_label?: string | null;
        cta_url?: string | null;
        category_label?: string | null;
        assigned_to?: string | null;
    },
) {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    if (!input.title || input.title.trim().length === 0) {
        return { data: null, error: 'Title is required for every locale.' };
    }

    const { data, error } = await auth.context.supabase
        .from(TRANSLATIONS_TABLE)
        .upsert(
            {
                page_id: pageId,
                organization_id: auth.organizationId,
                locale,
                title: input.title.trim(),
                content: input.content ?? {},
                meta_title: input.meta_title ?? null,
                meta_description: input.meta_description ?? null,
                cover_image_url: input.cover_image_url ?? null,
                cover_alt_text: input.cover_alt_text ?? null,
                cta_label: input.cta_label ?? null,
                cta_url: input.cta_url ?? null,
                category_label: input.category_label ?? null,
                assigned_to: input.assigned_to ?? null,
                source: 'human',
                updated_by: auth.context.userId,
            },
            { onConflict: 'page_id,locale' },
        )
        .select()
        .maybeSingle();

    if (error) {
        console.error('[upsertPageTranslation]', error.message);
        return { data: null, error: 'Unable to save translation. Please check the provided data.' };
    }

    revalidatePath('/admin/content');
    return { data, error: null };
}

/**
 * Move a page through the editorial workflow.
 * - Any transition: content.manage.
 * - Entering `published`: content.publish + every published locale must pass
 *   `canPublishLocale` (approved status + required fields).
 * - Records each decision in governance_approvals (approver identity + notes).
 */
export async function transitionContentWorkflow(
    pageId: string,
    to: ContentWorkflowState,
    notes?: string,
) {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { error: auth.error };

    const { data: page, error: pageError } = await auth.context.supabase
        .from(TABLE)
        .select('id, workflow_state, status')
        .eq('id', pageId)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (pageError || !page) return { error: 'Content page not found.' };

    const from = ((page as { workflow_state?: string }).workflow_state ?? 'draft') as ContentWorkflowState;
    if (!canTransitionWorkflow(from, to)) {
        return { error: `Cannot move from "${from}" to "${to}".` };
    }

    if (to === 'published') {
        const publishCheck = await authorizePermission(PERMISSIONS.content.publish);
        if (!publishCheck.ok) return { error: publishCheck.error };

        // Guard: at least the default locale must be publishable.
        const { data: rows } = await auth.context.supabase
            .from(TRANSLATIONS_TABLE)
            .select('locale, status, title, content, meta_title, meta_description, cover_image_url, cover_alt_text, cta_label, cta_url, category_label')
            .eq('page_id', pageId)
            .eq('organization_id', auth.organizationId);

        const byLocale = new Map((rows ?? []).map((r: { locale: string } & Record<string, unknown>) => [r.locale, r]));
        const defaultRow = byLocale.get('en') as
            | { status: string; title: string; [k: string]: unknown }
            | undefined;
        if (!defaultRow) {
            return { error: 'The default (EN) translation is missing — complete it before publishing.' };
        }
        const gate = canPublishLocale(
            defaultRow as unknown as Record<string, unknown>,
            (defaultRow.status as 'draft' | 'machine_translated' | 'in_review' | 'approved' | 'published') ?? 'draft',
        );
        if (!gate.ok) return { error: gate.reason ?? 'Default locale is not ready to publish.' };
    }

    const patch: Record<string, unknown> = { workflow_state: to };
    if (to === 'published') {
        patch.status = 'published';
        patch.published_at = new Date().toISOString();
    }
    if (from === 'published' && to !== 'published') {
        patch.status = 'draft';
        patch.published_at = null;
    }
    if (to === 'archived') patch.status = 'archived';

    const { error: updateError } = await auth.context.supabase
        .from(TABLE)
        .update(patch)
        .eq('id', pageId)
        .eq('organization_id', auth.organizationId);

    if (updateError) {
        console.error('[transitionContentWorkflow]', updateError.message);
        return { error: 'Unable to change workflow state. Please try again.' };
    }

    // Approval history (review requests, approvals, change requests).
    if (to === 'in_review' || to === 'approved' || to === 'changes_requested' || to === 'published') {
        const approvalStatus =
            to === 'approved' || to === 'published'
                ? 'approved'
                : to === 'changes_requested'
                  ? 'changes_requested'
                  : 'pending';
        await auth.context.supabase.from(APPROVALS_TABLE).insert({
            organization_id: auth.organizationId,
            entity_type: 'content_page',
            entity_id: pageId,
            requested_by: auth.context.userId,
            status: approvalStatus,
            reviewer_id: to === 'in_review' ? null : auth.context.userId,
            review_notes:
                notes ??
                (to === 'in_review'
                    ? 'Review requested. AI-generated text requires human review before approval.'
                    : null),
        });
    }

    if (to === 'in_review') {
        try {
            const { sendReviewRequest } = await import('@/actions/email');
            await sendReviewRequest(pageId, '', auth.context.userId);
        } catch {
            console.error('[transitionContentWorkflow] Failed to send review notification.');
        }
    }

    revalidatePath('/admin/content');
    revalidatePath('/', 'layout');
    revalidatePublicContentRoutes();
    return { error: null };
}

/**
 * Move one page-translation row through draft -> in_review -> approved -> published.
 * Publishing enforces the locale publish gate (approved + required fields)
 * and requires content.publish. Requires content.manage otherwise.
 */
export async function setPageTranslationStatus(
    pageId: string,
    locale: string,
    status: 'draft' | 'in_review' | 'approved' | 'published',
) {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { error: auth.error };

    const { data: existing } = await auth.context.supabase
        .from(TRANSLATIONS_TABLE)
        .select('title, content, meta_title, meta_description, cover_image_url, cover_alt_text, cta_label, cta_url, category_label')
        .eq('page_id', pageId)
        .eq('locale', locale)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!existing) return { error: 'Translation not found. Save the translation first.' };

    if (status === 'published') {
        const publishCheck = await authorizePermission(PERMISSIONS.content.publish);
        if (!publishCheck.ok) return { error: publishCheck.error };
        const row = existing as Record<string, unknown>;
        const payload = {
            title: row.title,
            body: (row.content as Record<string, unknown> | undefined) ?? {},
            meta_title: row.meta_title,
            meta_description: row.meta_description,
            cover_image_url: row.cover_image_url,
            cover_alt_text: row.cover_alt_text,
            cta_label: row.cta_label,
            cta_url: row.cta_url,
            category_label: row.category_label,
        };
        const gate = canPublishLocale(payload, 'approved');
        if (!gate.ok) return { error: gate.reason ?? 'Translation is not ready to publish.' };
    }

    const { error } = await auth.context.supabase
        .from(TRANSLATIONS_TABLE)
        .update({ status })
        .eq('page_id', pageId)
        .eq('locale', locale)
        .eq('organization_id', auth.organizationId);

    if (error) {
        console.error('[setPageTranslationStatus]', error.message);
        return { error: 'Unable to change translation status. Please try again.' };
    }
    revalidatePath('/admin/content');
    revalidatePath('/', 'layout');
    revalidatePublicContentRoutes();
    return { error: null };
}

/** Approval history for a page (newest first). Requires content.read. */
export async function getPageApprovals(pageId: string) {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from(APPROVALS_TABLE)
        .select('*')
        .eq('entity_type', 'content_page')
        .eq('entity_id', pageId)
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('[getPageApprovals]', error.message);
        return { data: [], error: null };
    }
    return { data: data ?? [], error: null };
}

// ---------------------------------------------------------------------
// AI translation (provider call + mandatory human review gate)
// ---------------------------------------------------------------------

export type AiTranslationProvider = 'none' | 'openai' | 'deepl' | 'google';

function getAiTranslationConfig(): {
    provider: AiTranslationProvider;
    model: string | null;
    configured: boolean;
    apiUrl: string | null;
} {
    const provider = (process.env.CMS_TRANSLATION_PROVIDER ?? 'none') as AiTranslationProvider;
    if (provider === 'none') return { provider, model: null, configured: false, apiUrl: null };
    const hasKey =
        !!process.env.CMS_TRANSLATION_API_KEY ||
        !!process.env.OPENAI_API_KEY ||
        !!process.env.DEEPL_API_KEY ||
        !!process.env.GOOGLE_TRANSLATION_API_KEY;
    const apiUrl = process.env.CMS_TRANSLATION_API_URL ?? null;
    return { provider, model: process.env.CMS_TRANSLATION_MODEL ?? null, configured: hasKey, apiUrl };
}

function translationPayload(row: Record<string, unknown>) {
    const content = row.content;
    return {
        title: row.title,
        body: content && typeof content === 'object' && !Array.isArray(content) ? content : {},
        meta_title: row.meta_title ?? null,
        meta_description: row.meta_description ?? null,
        cover_alt_text: row.cover_alt_text ?? null,
        cta_label: row.cta_label ?? null,
        cta_url: row.cta_url ?? null,
        category_label: row.category_label ?? null,
    };
}

async function translateWithProvider(
    payload: Record<string, unknown>,
    sourceLocale: string,
    targetLocale: string,
    provider: AiTranslationProvider,
    config: { model: string | null; apiUrl: string | null },
): Promise<Record<string, unknown>> {
    const endpoint = config.apiUrl ?? getProviderEndpoint(provider);
    if (!endpoint) throw new Error(`No API endpoint configured for provider "${provider}".`);

    if (provider === 'openai') {
        const apiKey = process.env.CMS_TRANSLATION_API_KEY ?? process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('Missing OpenAI API key.');
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: config.model ?? 'gpt-4o-mini',
                temperature: 0.2,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content:
                            'Translate CMS content into the requested locale. Return only valid JSON with the same keys. Translate human-readable text, preserve URLs exactly, and never invent missing content.',
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({ source_locale: sourceLocale, target_locale: targetLocale, content: payload }),
                    },
                ],
            }),
            signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`OpenAI returned ${response.status}.`);
        const result = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = result.choices?.[0]?.message?.content;
        if (!content) throw new Error('OpenAI returned no content.');
        const parsed: unknown = JSON.parse(content);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('OpenAI returned an invalid content shape.');
        }
        return parsed as Record<string, unknown>;
    }

    if (provider === 'deepl') {
        const apiKey = process.env.DEEPL_API_KEY;
        if (!apiKey) throw new Error('Missing DeepL API key.');
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: JSON.stringify(payload),
                source_lang: sourceLocale.toUpperCase().replace('-', '_'),
                target_lang: targetLocale.toUpperCase().replace('-', '_'),
                formality: 'more',
            }),
            signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`DeepL returned ${response.status}.`);
        const result = (await response.json()) as { translations?: Array<{ text?: string }> };
        const text = result.translations?.[0]?.text;
        if (!text) throw new Error('DeepL returned no content.');
        const parsed: unknown = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('DeepL returned an invalid content shape.');
        }
        return parsed as Record<string, unknown>;
    }

    if (provider === 'google') {
        const apiKey = process.env.GOOGLE_TRANSLATION_API_KEY;
        if (!apiKey) throw new Error('Missing Google Translation API key.');
        const response = await fetch(`${endpoint}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: [JSON.stringify(payload)],
                source: sourceLocale,
                target: targetLocale,
            }),
            signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`Google Translation API returned ${response.status}.`);
        const result = (await response.json()) as { data?: { translations?: Array<{ translatedText?: string }> } };
        const text = result.data?.translations?.[0]?.translatedText;
        if (!text) throw new Error('Google Translation API returned no content.');
        const parsed: unknown = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Google Translation API returned an invalid content shape.');
        }
        return parsed as Record<string, unknown>;
    }

    throw new Error(`Unsupported translation provider: "${provider}".`);
}

function getProviderEndpoint(provider: AiTranslationProvider): string | null {
    switch (provider) {
        case 'openai':
            return process.env.CMS_TRANSLATION_API_URL ?? 'https://api.openai.com/v1/chat/completions';
        case 'deepl':
            return process.env.CMS_TRANSLATION_API_URL ?? 'https://api-free.deepl.com/v2/translate';
        case 'google':
            return process.env.CMS_TRANSLATION_API_URL ?? 'https://translation.googleapis.com/language/translate/v2';
        default:
            return null;
    }
}

/**
 * Request AI translation for one locale.
 *
 * Creates a machine-translated row and flags it for mandatory human review.
 * It never auto-publishes; approval and publishing remain separate steps.
 */
export async function requestAiTranslation(
    pageId: string,
    targetLocale: string,
    sourceLocale = 'en',
): Promise<{ data: Record<string, unknown> | null; error: string | null; warning?: string }> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    if (!isSupportedLocale(targetLocale) || !isSupportedLocale(sourceLocale)) {
        return { data: null, error: 'Source and target locales must be supported locales.' };
    }
    if (targetLocale === sourceLocale) return { data: null, error: 'Choose a different target locale.' };

    const config = getAiTranslationConfig();
    if (!config.configured) {
        return {
            data: null,
            error:
                'AI translation is not configured. Set CMS_TRANSLATION_PROVIDER and CMS_TRANSLATION_API_KEY to enable it. You can still add translations manually.',
        };
    }

    try {
        const { data: source, error: sourceError } = await auth.context.supabase
            .from(TRANSLATIONS_TABLE)
            .select('title, content, meta_title, meta_description, cover_alt_text, cta_label, cta_url, category_label')
            .eq('page_id', pageId)
            .eq('locale', sourceLocale)
            .eq('organization_id', auth.organizationId)
            .maybeSingle();
        if (sourceError || !source) return { data: null, error: 'Save the source translation before requesting AI translation.' };

        const translated = await translateWithProvider(
            translationPayload(source),
            sourceLocale,
            targetLocale,
            config.provider,
            { model: config.model, apiUrl: config.apiUrl },
        );
        const parsed = localeContentSchema.safeParse(translated);
        if (!parsed.success) return { data: null, error: 'AI translation returned incomplete or invalid content. Please translate manually.' };
        const { body, ...translatedFields } = parsed.data;

        const { data, error } = await auth.context.supabase
            .from(TRANSLATIONS_TABLE)
            .upsert(
                {
                    page_id: pageId,
                    organization_id: auth.organizationId,
                    locale: targetLocale,
                    ...translatedFields,
                    content: body ?? {},
                    status: 'machine_translated',
                    source: 'ai',
                    ai_provider: config.provider,
                    ai_model: config.model ?? 'gpt-4o-mini',
                    last_translated_at: new Date().toISOString(),
                    updated_by: auth.context.userId,
                },
                { onConflict: 'page_id,locale' },
            )
            .select()
            .single();
        if (error) throw error;

        revalidatePath(`/admin/content/${pageId}`);
        revalidatePath('/admin/content');

        try {
            await notifyReviewRequest(pageId, targetLocale, auth.context.userId, auth.context.supabase);
        } catch {
            console.error('[requestAiTranslation] Failed to send review notification.');
        }

        return {
            data: data as Record<string, unknown>,
            error: null,
            warning: 'AI-generated text requires human review before approval or publishing.',
        };
    } catch (err) {
        console.error('[requestAiTranslation]', err);
        return {
            data: null,
            error: 'Translation failed. The source text was left unchanged — please try again or translate manually.',
        };
    }
}

export type { ContentWorkflowState };

// ---------------------------------------------------------------------
// Email notification callbacks
// ---------------------------------------------------------------------

async function notifyReviewRequest(
    pageId: string,
    locale: string,
    userId: string,
    supabase: import('@supabase/supabase-js').SupabaseClient,
): Promise<void> {
    try {
        const { sendReviewRequest } = await import('@/actions/email');
        await sendReviewRequest(pageId, locale, userId);
    } catch {
        // Non-fatal: notification failure should not block the workflow.
        console.error('[notifyReviewRequest] Could not send review notification.');
    }
}

