-- =====================================================
-- NGO OS - CMS revision history + draft preview links
-- Powers the admin content editor (P0 item 5):
--
--  * `content_page_revisions`: append-only snapshots written by
--    the app before every page update (title/slug/content/meta/
--    cover/status/workflow_state). Restore = copy snapshot back.
--  * `content_pages.preview_token`: stable unguessable UUID per
--    page. Anyone with the link can preview the DRAFT via the
--    SECURITY DEFINER `public_content_preview()` function —
--    no login, no RLS bypass, token-gated only.
-- =====================================================

-- =====================================================
-- 1. Preview token on content_pages
-- =====================================================
ALTER TABLE content_pages
    ADD COLUMN IF NOT EXISTS preview_token UUID NOT NULL DEFAULT gen_random_uuid();

-- =====================================================
-- 2. Revision snapshots (append-only, never updated)
-- =====================================================
CREATE TABLE IF NOT EXISTS content_page_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES content_pages(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    status TEXT NOT NULL,
    workflow_state TEXT NOT NULL DEFAULT 'draft',
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    meta_title TEXT,
    meta_description TEXT,
    cover_image_url TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_revisions_page
    ON content_page_revisions(page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_revisions_org
    ON content_page_revisions(organization_id, page_id);

ALTER TABLE content_page_revisions ENABLE ROW LEVEL SECURITY;

-- Revisions are read with content.read; written by the app alongside
-- page updates (content.manage). Never updated or deleted via API —
-- only INSERT + SELECT policies; cleanup is org-scoped delete.
DROP POLICY IF EXISTS page_revisions_select ON content_page_revisions;
CREATE POLICY page_revisions_select ON content_page_revisions
    FOR SELECT USING (
        public.user_has_permission(organization_id, 'content.read')
    );

DROP POLICY IF EXISTS page_revisions_insert ON content_page_revisions;
CREATE POLICY page_revisions_insert ON content_page_revisions
    FOR INSERT WITH CHECK (
        public.user_has_permission(organization_id, 'content.manage')
    );

DROP POLICY IF EXISTS page_revisions_delete ON content_page_revisions;
CREATE POLICY page_revisions_delete ON content_page_revisions
    FOR DELETE USING (
        public.user_has_permission(organization_id, 'content.manage')
    );

DROP TRIGGER IF EXISTS trg_prevent_org_change ON content_page_revisions;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON content_page_revisions
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

-- =====================================================
-- 3. Token-gated draft preview (anon-safe, no RLS bypass
--    beyond the token check). Returns the page plus its
--    translation rows regardless of status.
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_content_preview(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_page content_pages%ROWTYPE;
BEGIN
    SELECT * INTO v_page FROM content_pages WHERE preview_token = p_token LIMIT 1;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_page.id,
        'title', v_page.title,
        'slug', v_page.slug,
        'status', v_page.status,
        'workflow_state', v_page.workflow_state,
        'content', v_page.content,
        'meta_title', v_page.meta_title,
        'meta_description', v_page.meta_description,
        'cover_image_url', v_page.cover_image_url,
        'published_at', v_page.published_at,
        'updated_at', v_page.updated_at,
        'translations', COALESCE((
            SELECT jsonb_object_agg(t.locale, jsonb_build_object(
                'status', t.status,
                'title', t.title,
                'content', t.content,
                'meta_title', t.meta_title,
                'meta_description', t.meta_description,
                'cover_image_url', t.cover_image_url,
                'cover_alt_text', t.cover_alt_text,
                'cta_label', t.cta_label,
                'cta_url', t.cta_url,
                'category_label', t.category_label,
                'version', t.version,
                'updated_at', t.updated_at
            )) FROM content_page_translations t WHERE t.page_id = v_page.id
        ), '{}'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_content_preview(uuid) TO anon, authenticated;
