-- =====================================================
-- NGO OS - News articles, impact stories and volunteer roles
--
-- Closes the last set of development-only public surfaces. Before
-- this migration the news + stories hubs and the volunteer role
-- board had no backing tables, so those pages rendered empty
-- lists in production (the fixture content was gated behind
-- NODE_ENV === 'development').
--
-- Three organization-owned tables with the standard tenant
-- policies (migration 14), org-id immutability (15) and
-- updated_at triggers (12), plus narrow public VIEWS scoped to
-- public_default_org_id() (18) so anonymous visitors only ever
-- see published rows of safe columns.
-- =====================================================

-- =====================================================
-- 1. News articles (managed in /admin/content/news)
-- =====================================================
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL DEFAULT '',
    cover_image_url TEXT,
    cover_alt_text TEXT,
    category TEXT,
    author_name TEXT,
    author_avatar_url TEXT,
    author_role TEXT,
    read_minutes INT CHECK (read_minutes IS NULL OR read_minutes > 0),
    tags TEXT[] NOT NULL DEFAULT '{}'::text[],
    key_takeaways TEXT[] NOT NULL DEFAULT '{}'::text[],
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- =====================================================
-- 2. Impact stories (managed in /admin/content/stories)
-- `subject_role` is exposed as `role` through the public view.
-- Timeline + impact stats are JSONB arrays so editors can add
-- as many milestones as a story needs.
-- =====================================================
CREATE TABLE IF NOT EXISTS impact_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    summary TEXT,
    content TEXT NOT NULL DEFAULT '',
    story_type TEXT NOT NULL DEFAULT 'article'
        CHECK (story_type IN ('article', 'video', 'audio', 'photo')),
    program TEXT,
    subject_role TEXT NOT NULL DEFAULT 'beneficiary'
        CHECK (subject_role IN ('beneficiary', 'volunteer', 'partner', 'donor')),
    author_name TEXT,
    author_avatar_url TEXT,
    image_url TEXT,
    image_alt TEXT,
    media_url TEXT,
    transcript_url TEXT,
    duration_label TEXT,
    timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
    impact_stats JSONB NOT NULL DEFAULT '[]'::jsonb,
    consent_obtained BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- =====================================================
-- 3. Volunteer roles (openings, not people)
-- Distinct from `volunteers` (the people table): this is the
-- public "get involved" board managed in /admin/volunteers/roles.
-- =====================================================
CREATE TABLE IF NOT EXISTS volunteer_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL DEFAULT 'Remote',
    work_type TEXT NOT NULL DEFAULT 'onsite'
        CHECK (work_type IN ('onsite', 'remote', 'hybrid')),
    category TEXT,
    commitment TEXT NOT NULL DEFAULT '',
    responsibilities TEXT[] NOT NULL DEFAULT '{}'::text[],
    requirements TEXT[] NOT NULL DEFAULT '{}'::text[],
    openings INT NOT NULL DEFAULT 1 CHECK (openings > 0),
    is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
    published_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- =====================================================
-- 4. Indexes for the admin lists + public ordering
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_news_articles_org_status
    ON news_articles(organization_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_featured
    ON news_articles(organization_id, is_featured, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_tags
    ON news_articles USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_impact_stories_org_status
    ON impact_stories(organization_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_impact_stories_featured
    ON impact_stories(organization_id, is_featured, published_at DESC);

-- =====================================================
-- 5. Row level security (standard tenant policy generator)
-- News + stories ride on the existing content permissions;
-- volunteer role board on the volunteers permissions.
-- =====================================================
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_roles ENABLE ROW LEVEL SECURITY;

SELECT public.add_tenant_policies('news_articles', 'content.read', 'content.manage', 'content.publish');
SELECT public.add_tenant_policies('impact_stories', 'content.read', 'content.manage', 'content.publish');
SELECT public.add_tenant_policies('volunteer_roles', 'volunteers.read', 'volunteers.manage');

-- =====================================================
-- 6. Guards: organization_id immutable + updated_at maintained
-- (migration 12 and 15 loops already ran before these tables
-- existed, so the triggers are created explicitly here.)
-- =====================================================
DROP TRIGGER IF EXISTS trg_prevent_org_change ON news_articles;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON news_articles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

DROP TRIGGER IF EXISTS trg_prevent_org_change ON impact_stories;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON impact_stories
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

DROP TRIGGER IF EXISTS trg_prevent_org_change ON volunteer_roles;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON volunteer_roles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

DROP TRIGGER IF EXISTS update_news_articles_updated_at ON news_articles;
CREATE TRIGGER update_news_articles_updated_at
    BEFORE UPDATE ON news_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_impact_stories_updated_at ON impact_stories;
CREATE TRIGGER update_impact_stories_updated_at
    BEFORE UPDATE ON impact_stories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_volunteer_roles_updated_at ON volunteer_roles;
CREATE TRIGGER update_volunteer_roles_updated_at
    BEFORE UPDATE ON volunteer_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. Public projections (published rows, safe columns only)
-- Same pattern as 20240101000018/20/21: scoped to
-- public_default_org_id(), granted to anon + authenticated.
-- Author emails, created_by and consent flags never leave the
-- database through these views.
-- =====================================================
DROP VIEW IF EXISTS public_news_articles CASCADE;
CREATE VIEW public_news_articles AS
    SELECT id, slug, title, excerpt, content,
           cover_image_url, cover_alt_text, category,
           author_name, author_avatar_url, author_role, read_minutes,
           tags, key_takeaways, is_featured,
           published_at, created_at
    FROM news_articles
    WHERE status = 'published'
      AND organization_id = public.public_default_org_id()
    ORDER BY is_featured DESC, published_at DESC NULLS LAST;

GRANT SELECT ON public_news_articles TO anon, authenticated;

DROP VIEW IF EXISTS public_impact_stories CASCADE;
CREATE VIEW public_impact_stories AS
    SELECT id, slug, title, summary, content,
           story_type, program,
           subject_role AS role,
           author_name, author_avatar_url,
           image_url, image_alt,
           media_url, transcript_url, duration_label,
           timeline, impact_stats, is_featured,
           published_at, created_at
    FROM impact_stories
    WHERE status = 'published'
      AND organization_id = public.public_default_org_id()
    ORDER BY is_featured DESC, published_at DESC NULLS LAST;

GRANT SELECT ON public_impact_stories TO anon, authenticated;

DROP VIEW IF EXISTS public_volunteer_roles CASCADE;
CREATE VIEW public_volunteer_roles AS
    SELECT id, slug, title, description, location,
           work_type, category, commitment,
           responsibilities, requirements, openings,
           is_urgent, created_at
    FROM volunteer_roles
    WHERE status = 'open'
      AND organization_id = public.public_default_org_id()
    ORDER BY is_urgent DESC, created_at DESC;

GRANT SELECT ON public_volunteer_roles TO anon, authenticated;
