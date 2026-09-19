-- =====================================================
-- NGO OS - Safe Public Data Projections
-- Consolidated from legacy schema-public-views.sql
-- Fixes the privacy leaks in the legacy schema-public-access.sql
-- where anonymous visitors had SELECT on the full base tables
-- (donations exposed amounts + donorship; projects exposed
-- budget/spent; donors exposed contact data). The public site now
-- reads through narrowly-scoped VIEWS that expose only safe
-- columns for the designated public organization.
--
-- The public organization is chosen via organizations.settings->>
-- 'public_site' = 'true', falling back to the oldest active org.
-- =====================================================

-- =====================================================
-- 1. Public organization resolution
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_default_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT id FROM organizations
          WHERE status = 'active' AND (settings->>'public_site')::boolean IS TRUE
          ORDER BY created_at ASC LIMIT 1),
        (SELECT id FROM organizations WHERE status = 'active'
          ORDER BY created_at ASC LIMIT 1)
    );
$$;

-- =====================================================
-- 2. Public campaigns (safe columns, active only)
-- =====================================================
DROP VIEW IF EXISTS public_campaigns CASCADE;
CREATE VIEW public_campaigns AS
    SELECT id, name, slug, description,
           goal_amount, raised_amount, currency,
           cover_image_url, video_url, start_date, end_date, created_at
    FROM campaigns
    WHERE status = 'active'
      AND organization_id = public.public_default_org_id();

GRANT SELECT ON public_campaigns TO anon, authenticated;

-- =====================================================
-- 3. Public projects (safe columns, active/completed only)
--    budget, spent and internal documents are NOT exposed.
-- =====================================================
DROP VIEW IF EXISTS public_projects CASCADE;
CREATE VIEW public_projects AS
    SELECT id, name, slug, description, category, status,
           start_date, end_date, location, country,
           beneficiaries_target, beneficiaries_reached, progress,
           cover_image_url, gallery_urls, created_at
    FROM projects
    WHERE status IN ('active', 'completed')
      AND organization_id = public.public_default_org_id();

GRANT SELECT ON public_projects TO anon, authenticated;

-- =====================================================
-- 4. Public partners (safe columns, active only)
--    contact details are NOT exposed.
-- =====================================================
DROP VIEW IF EXISTS public_partners CASCADE;
CREATE VIEW public_partners AS
    SELECT id, name, type, partnership_type, website,
           description, logo_url, created_at
    FROM partners
    WHERE status = 'active'
      AND organization_id = public.public_default_org_id();

GRANT SELECT ON public_partners TO anon, authenticated;

-- =====================================================
-- 5. Aggregate impact statistics (no per-row exposure)
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_impact_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH org AS (
        SELECT public.public_default_org_id() AS id
    ),
    donations AS (
        SELECT COUNT(*) AS total_donations,
               COALESCE(SUM(amount), 0) AS total_amount
        FROM donations d, org
        WHERE d.organization_id = org.id AND d.status = 'completed'
    ),
    projects AS (
        SELECT COUNT(*) AS active_projects FROM projects p, org
        WHERE p.organization_id = org.id AND p.status = 'active'
    ),
    campaigns AS (
        SELECT COUNT(*) AS active_campaigns FROM campaigns c, org
        WHERE c.organization_id = org.id AND c.status = 'active'
    )
    SELECT jsonb_build_object(
        'total_donations', (SELECT total_donations FROM donations),
        'total_amount',    (SELECT total_amount FROM donations),
        'active_projects', (SELECT active_projects FROM projects),
        'active_campaigns',(SELECT active_campaigns FROM campaigns)
    );
$$;

GRANT EXECUTE ON FUNCTION public.public_default_org_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_impact_stats() TO anon, authenticated;
