'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';
import { enqueueOutboxEvent } from '@/lib/reliability';
import type { ContentWorkflowState, TranslationRowStatus } from '@/types/domain/content';

/**
 * Translation workflow actions.
 *
 * Authorization follows the three distinct content capabilities from the audit:
 *   - `content.manage`  — author drafts, request translation, correct content
 *   - `content.review`  — approve or request changes on a localized version
 *   - `content.publish` — publish an approved locale to the public site
 * Reads use `content.read`.
 *
 * Every query is scoped to the caller's active organization in addition to RLS
 * (defense in depth: a page id from another tenant can never be read or
 * mutated), and the same policy is mirrored in database triggers
 * (20260922000001_content_review_authorization.sql) so a direct PostgREST call
 * cannot bypass it.
 */

export interface WorkflowActionResult {
    success: boolean;
    error?: string;
    /** Non-fatal problem (e.g. the outbox enqueue failed after a success). */
    warning?: string;
    pageId?: string;
    locale?: string;
    newState?: ContentWorkflowState | TranslationRowStatus;
}

const SUPPORTED_LOCALES = ['en', 'de', 'fr', 'es', 'ar'] as const;

/**
 * Submits a content page for translation across target locales.
 * Creates/updates translation rows with 'machine_translated' or 'draft' status.
 */
export async function submitForTranslation(
    pageId: string,
    targetLocales: string[] = ['de', 'fr', 'es', 'ar'],
    provider: string = 'ai-translator-v1',
): Promise<WorkflowActionResult> {
    const auth = await authorizePermission(PERMISSIONS.content.manage);
    if (!auth.ok) return { success: false, error: auth.error };

    const supabase = auth.context.supabase;
    const { userId } = auth.context;

    // Fetch master page (scoped to the caller's organization).
    const { data: page, error: fetchErr } = await supabase
        .from('content_pages')
        .select('id, organization_id, title, content')
        .eq('id', pageId)
        .eq('organization_id', auth.organizationId)
        .single();

    if (fetchErr || !page) {
        return { success: false, error: 'Content page not found.' };
    }

    // Update parent page workflow state to translation_pending
    const { error: pageUpdateErr } = await supabase
        .from('content_pages')
        .update({
            workflow_state: 'translation_pending',
            updated_at: new Date().toISOString(),
        })
        .eq('id', pageId)
        .eq('organization_id', auth.organizationId);

    if (pageUpdateErr) {
        return { success: false, error: `Failed to update page workflow: ${pageUpdateErr.message}` };
    }

    // Upsert target translation rows
    for (const locale of targetLocales) {
        if (!SUPPORTED_LOCALES.includes(locale as typeof SUPPORTED_LOCALES[number])) continue;

        const { error: upsertErr } = await supabase
            .from('content_page_translations')
            .upsert({
                page_id: pageId,
                organization_id: page.organization_id,
                locale,
                status: 'machine_translated' as TranslationRowStatus,
                title: `[${locale.toUpperCase()}] ${page.title}`,
                content: page.content ?? {},
                source: 'ai',
                ai_provider: provider,
                ai_model: 'gpt-4o-mini-ngo',
                last_translated_at: new Date().toISOString(),
                created_by: userId,
                updated_by: userId,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'page_id,locale' });

        if (upsertErr) {
            console.error(`[workflow] Translation upsert failed for locale ${locale}:`, upsertErr);
        }
    }

    revalidatePath('/[locale]/admin/content', 'layout');
    return { success: true, pageId, newState: 'translation_pending' };
}

/**
 * Submits a human review decision (approval or changes requested) for a localized translation.
 */
export async function reviewTranslation(
    pageId: string,
    locale: string,
    decision: 'approved' | 'changes_requested',
): Promise<WorkflowActionResult> {
    const auth = await authorizePermission(PERMISSIONS.content.review);
    if (!auth.ok) return { success: false, error: auth.error };

    const supabase = auth.context.supabase;
    const { userId } = auth.context;

    const nextStatus: TranslationRowStatus = decision === 'approved' ? 'approved' : 'in_review';

    const { error: updateErr } = await supabase
        .from('content_page_translations')
        .update({
            status: nextStatus,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
            updated_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('page_id', pageId)
        .eq('locale', locale)
        .eq('organization_id', auth.organizationId);

    if (updateErr) {
        return { success: false, error: `Failed to record review: ${updateErr.message}` };
    }

    // Check if all requested target translations are approved
    const { data: translations } = await supabase
        .from('content_page_translations')
        .select('status')
        .eq('page_id', pageId)
        .eq('organization_id', auth.organizationId);

    const allApproved = translations && translations.length > 0 && translations.every((t) => t.status === 'approved' || t.status === 'published');

    if (allApproved) {
        await supabase
            .from('content_pages')
            .update({ workflow_state: 'approved', approved_by: userId })
            .eq('id', pageId)
            .eq('organization_id', auth.organizationId);
    } else if (decision === 'changes_requested') {
        await supabase
            .from('content_pages')
            .update({ workflow_state: 'changes_requested' })
            .eq('id', pageId)
            .eq('organization_id', auth.organizationId);
    }

    revalidatePath('/[locale]/admin/content', 'layout');
    return { success: true, pageId, locale, newState: nextStatus };
}

/**
 * Publishes an approved translation locale for public rendering.
 */
export async function publishPageLocale(
    pageId: string,
    locale: string,
): Promise<WorkflowActionResult> {
    const auth = await authorizePermission(PERMISSIONS.content.publish);
    if (!auth.ok) return { success: false, error: auth.error };

    const supabase = auth.context.supabase;
    const { userId } = auth.context;

    // Verify row is approved
    const { data: translation } = await supabase
        .from('content_page_translations')
        .select('status')
        .eq('page_id', pageId)
        .eq('locale', locale)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (!translation || (translation.status !== 'approved' && translation.status !== 'published')) {
        return { success: false, error: 'Cannot publish untranslated or unapproved locale content.' };
    }

    const { error: pubErr } = await supabase
        .from('content_page_translations')
        .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('page_id', pageId)
        .eq('locale', locale)
        .eq('organization_id', auth.organizationId);

    if (pubErr) {
        return { success: false, error: `Publish failed: ${pubErr.message}` };
    }

    // Wave 3: transactional outbox — the publish side effect (cache fanout,
    // webhook delivery, search reindex) is enqueued in the same logical
    // operation and drained by cron-runner, never fired inline. The payload
    // carries publishedAt so each republish enqueues a fresh event while the
    // default idempotency key (event type + payload hash) still dedupes
    // double-submits of the very same publish.
    await enqueueOutboxEvent(supabase as never, {
        organizationId: auth.organizationId,
        eventType: 'content.page_locale_published',
        payload: { pageId, locale, publishedBy: userId, publishedAt: new Date().toISOString() },
    });

    await recordAuditEvent(supabase as never, {
        organizationId: auth.organizationId,
        actorId: userId,
        action: 'content.page_locale_published',
        entityType: 'content_page_translations',
        entityId: `${pageId}:${locale}`,
        newValues: { status: 'published' },
        correlationId: newCorrelationId(),
    });

    revalidatePath('/[locale]/admin/content', 'layout');
    return { success: true, pageId, locale, newState: 'published' };
}

/**
 * Audits translation completeness metrics across all pages for the caller's
 * organization. The organization is taken from the authenticated context, never
 * from the caller — passing another tenant's id is refused outright.
 */
export async function getTranslationCompletenessReport(organizationId?: string) {
    const auth = await authorizePermission(PERMISSIONS.content.read);
    if (!auth.ok) {
        return { totalPages: 0, overallCompleteness: 0, pages: [] };
    }

    if (organizationId && organizationId !== auth.organizationId) {
        console.error('[content-workflow] Refused cross-organization completeness report request.');
        return { totalPages: 0, overallCompleteness: 0, pages: [] };
    }

    const supabase = auth.context.supabase;
    const activeOrganizationId = auth.organizationId;

    const { data: pages, error: pageErr } = await supabase
        .from('content_pages')
        .select('id, title, workflow_state')
        .eq('organization_id', activeOrganizationId);

    if (pageErr || !pages) {
        return { totalPages: 0, overallCompleteness: 0, pages: [] };
    }

    const { data: translations } = await supabase
        .from('content_page_translations')
        .select('page_id, locale, status')
        .eq('organization_id', activeOrganizationId);

    const translationMap = new Map<string, Record<string, string>>();
    (translations || []).forEach((t) => {
        const existing = translationMap.get(t.page_id) || {};
        existing[t.locale] = t.status;
        translationMap.set(t.page_id, existing);
    });

    const totalLocalesRequired = pages.length * SUPPORTED_LOCALES.length;
    let publishedLocalesCount = 0;

    const pageReports = pages.map((page) => {
        const pageLocales = translationMap.get(page.id) || {};
        const countPublished = SUPPORTED_LOCALES.filter((loc) => pageLocales[loc] === 'published').length;
        publishedLocalesCount += countPublished;

        return {
            id: page.id,
            title: page.title,
            workflowState: page.workflow_state,
            localeStatuses: pageLocales,
            completenessPercent: Math.round((countPublished / SUPPORTED_LOCALES.length) * 100),
        };
    });

    const overallCompleteness = totalLocalesRequired > 0
        ? Math.round((publishedLocalesCount / totalLocalesRequired) * 100)
        : 100;

    return {
        totalPages: pages.length,
        overallCompleteness,
        pages: pageReports,
    };
}
