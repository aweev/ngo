-- =====================================================
-- NGO OS - CMS localization model + approval workflow
-- Formalizes the multilingual publishing model that the admin
-- `/admin/content` page advertises:
--
--  BEFORE: translations were inferred from
--  `content_pages.content->'translations'` JSON with no schema,
--  no validation, no per-locale lifecycle, and a hardcoded
--  "Approved (ED)" badge in the UI.
--
--  AFTER:
--   * `content_page_translations`: one row per (page, locale)
--     with status, versioning, ownership, timestamps.
--   * `content_pages.workflow_state`: draft | translation_pending |
--     in_review | changes_requested | approved | published | archived.
--   * Approval history reuses `governance_approvals`
--     (entity_type = 'content_page') — approver identity + notes.
--   * Legacy JSON columns from 20240101000009 (`translations`,
--     `translation_status`, `approval_status`, `approved_by`) are
--     kept read-only for back-compat and backfilled lazily.
--   * `public_content_page_translations`: anon-safe projection
--     (published translations of published pages only).
-- =====================================================

-- =====================================================
-- 1. Workflow state on content_pages
-- =====================================================
ALTER TABLE content_pages
    ADD COLUMN IF NOT EXISTS workflow_state TEXT NOT NULL DEFAULT 'draft'
    CHECK (workflow_state IN (
        'draft', 'translation_pending', 'in_review',
        'changes_requested', 'approved', 'published', 'archived'
    ));

-- Backfill workflow_state from legacy status/approval_status where possible.
UPDATE content_pages SET workflow_state =
    CASE
        WHEN status = 'archived' THEN 'archived'
        WHEN status = 'published' AND approval_status = 'approved' THEN 'published'
        WHEN status = 'published' THEN 'approved'
        WHEN approval_status = 'pending_approval' THEN 'in_review'
        WHEN approval_status = 'rejected' THEN 'changes_requested'
        ELSE 'draft'
    END
WHERE workflow_state = 'draft';

-- Translation ownership at page level (who owns the next translation pass).
ALTER TABLE content_pages
    ADD COLUMN IF NOT EXISTS translation_assignee UUID;
ALTER TABLE content_pages
    ADD COLUMN IF NOT EXISTS last_translated_at TIMESTAMPTZ;

-- =====================================================
-- 2. Per-locale translation rows (preferred store)
-- =====================================================
CREATE TABLE IF NOT EXISTS content_page_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES content_pages(id) ON DELETE CASCADE,
    locale TEXT NOT NULL CHECK (locale IN ('en', 'de', 'fr', 'es', 'ar')),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'machine_translated', 'in_review', 'approved', 'published')),
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    meta_title TEXT,
    meta_description TEXT,
    cover_image_url TEXT,
    cover_alt_text TEXT,
    cta_label TEXT,
    cta_url TEXT,
    category_label TEXT,
    version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
    assigned_to UUID,
    source TEXT NOT NULL DEFAULT 'human'
        CHECK (source IN ('human', 'ai', 'import')),
    ai_provider TEXT,
    ai_model TEXT,
    last_translated_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(page_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_page_translations_org ON content_page_translations(organization_id, page_id);
CREATE INDEX IF NOT EXISTS idx_page_translations_locale ON content_page_translations(page_id, locale);
CREATE INDEX IF NOT EXISTS idx_page_translations_status ON content_page_translations(organization_id, status);

-- updated_at maintenance
DROP TRIGGER IF EXISTS update_content_page_translations_updated_at ON content_page_translations;
CREATE TRIGGER update_content_page_translations_updated_at
    BEFORE UPDATE ON content_page_translations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- org_id immutability
DROP TRIGGER IF EXISTS trg_prevent_org_change ON content_page_translations;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON content_page_translations
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

-- Version bump on every content change (audit history via version counter).
CREATE OR REPLACE FUNCTION public.bump_translation_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.title IS DISTINCT FROM OLD.title
        OR NEW.content IS DISTINCT FROM OLD.content
        OR NEW.meta_title IS DISTINCT FROM OLD.meta_title
        OR NEW.meta_description IS DISTINCT FROM OLD.meta_description
        OR NEW.cover_image_url IS DISTINCT FROM OLD.cover_image_url
        OR NEW.cover_alt_text IS DISTINCT FROM OLD.cover_alt_text
        OR NEW.cta_label IS DISTINCT FROM OLD.cta_label
        OR NEW.cta_url IS DISTINCT FROM OLD.cta_url
        OR NEW.category_label IS DISTINCT FROM OLD.category_label
    THEN
        NEW.version := COALESCE(OLD.version, 1) + 1;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_translation_version ON content_page_translations;
CREATE TRIGGER trg_bump_translation_version
    BEFORE UPDATE ON content_page_translations
    FOR EACH ROW EXECUTE FUNCTION public.bump_translation_version();

-- Guard: publishing a locale row requires content.publish (same gate as pages).
CREATE OR REPLACE FUNCTION public.enforce_translation_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND (NEW.status = 'published' OR OLD.status = 'published')
       AND NOT public.user_has_permission(NEW.organization_id, 'content.publish') THEN
        RAISE EXCEPTION 'Requires content.publish to publish or unpublish a translation.';
    END IF;
    -- Publishing requires a non-empty title (prevents untranslated publishes).
    IF NEW.status = 'published' AND (NEW.title IS NULL OR btrim(NEW.title) = '') THEN
        RAISE EXCEPTION 'Cannot publish a translation without a title.';
    END IF;
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
        NEW.published_at := NOW();
    END IF;
    IF NEW.status <> 'published' THEN
        NEW.published_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_translation_publish ON content_page_translations;
CREATE TRIGGER trg_enforce_translation_publish
    BEFORE INSERT OR UPDATE ON content_page_translations
    FOR EACH ROW EXECUTE FUNCTION public.enforce_translation_publish();

-- RLS: same content permissions as pages (publish-gated updates).
ALTER TABLE content_page_translations ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies(
    'content_page_translations', 'content.read', 'content.manage', 'content.publish'
);

-- =====================================================
-- 3. Approval history reuses governance_approvals
-- (entity_type = 'content_page', entity_id = page id).
-- No new table needed; document the contract here.
-- =====================================================

-- =====================================================
-- 4. Anon-safe public projection: published translations
-- of published pages for the default org only.
-- =====================================================
DROP VIEW IF EXISTS public_content_page_translations CASCADE;
CREATE VIEW public_content_page_translations AS
    SELECT t.page_id, p.slug AS page_slug,
           t.locale, t.status, t.title, t.content,
           t.meta_title, t.meta_description,
           t.cover_image_url, t.cover_alt_text,
           t.cta_label, t.cta_url, t.category_label,
           t.version, t.published_at, t.updated_at
    FROM content_page_translations t
    JOIN content_pages p ON p.id = t.page_id
    WHERE p.status = 'published'
      AND p.organization_id = public.public_default_org_id()
      AND t.organization_id = public.public_default_org_id()
      AND t.status = 'published';

GRANT SELECT ON public_content_page_translations TO anon, authenticated;
