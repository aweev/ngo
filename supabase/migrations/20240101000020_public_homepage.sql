-- =====================================================
-- NGO OS - Public homepage projections
-- Powers the public landing page entirely from the admin
-- command center (content_pages, impact_metrics, org_events).
-- Follows the same pattern as 20240101000018_public_views.sql:
-- narrow views scoped to public_default_org_id(), granted to
-- anon + authenticated. No private columns leak.
-- =====================================================

-- =====================================================
-- 1. Public content pages (published only, safe columns)
-- Admin manages via /admin/content. Homepage reads:
--   - slug = 'homepage-hero' / 'homepage-mission' /
--     'homepage-get-involved' for editable sections
--   - content->>'category' = 'news' | 'story' | 'testimonial'
--     for news / success stories / hero testimonials
-- =====================================================
DROP VIEW IF EXISTS public_content_pages CASCADE;
CREATE VIEW public_content_pages AS
    SELECT id, title, slug, content,
           meta_title, meta_description,
           cover_image_url, published_at, created_at, updated_at
    FROM content_pages
    WHERE status = 'published'
      AND organization_id = public.public_default_org_id();

GRANT SELECT ON public_content_pages TO anon, authenticated;

-- =====================================================
-- 2. Public content blocks (only for published pages)
-- Lets admins compose homepage sections from blocks
-- (hero / text / image / gallery / cta / embed).
-- =====================================================
DROP VIEW IF EXISTS public_content_blocks CASCADE;
CREATE VIEW public_content_blocks AS
    SELECT b.id, b.page_id, p.slug AS page_slug,
           b.name, b.type, b.content, b.sort_order,
           b.created_at
    FROM content_blocks b
    JOIN content_pages p ON p.id = b.page_id
    WHERE p.status = 'published'
      AND p.organization_id = public.public_default_org_id()
      AND b.organization_id = public.public_default_org_id()
    ORDER BY b.sort_order ASC;

GRANT SELECT ON public_content_blocks TO anon, authenticated;

-- =====================================================
-- 3. Public impact metrics (is_public only, no internals)
-- Admin manages via /admin/impact. Homepage ImpactSection
-- prefers these; falls back to public_impact_stats() when empty.
-- =====================================================
DROP VIEW IF EXISTS public_impact_metrics CASCADE;
CREATE VIEW public_impact_metrics AS
    SELECT id, name, slug, description, unit, category,
           current_value, target_value, baseline_value,
           created_at
    FROM impact_metrics
    WHERE is_public IS TRUE
      AND organization_id = public.public_default_org_id()
    ORDER BY created_at ASC;

GRANT SELECT ON public_impact_metrics TO anon, authenticated;

-- =====================================================
-- 4. Public events (published + public only, safe columns)
-- Admin manages via /admin/events. Homepage GetInvolved /
-- upcoming-events strip reads the next events.
-- =====================================================
DROP VIEW IF EXISTS public_events CASCADE;
CREATE VIEW public_events AS
    SELECT id, title, slug, description, type,
           start_date, end_date, location, city, country,
           virtual_link, max_attendees, registered_count,
           cover_image_url, created_at
    FROM org_events
    WHERE status = 'published'
      AND is_public IS TRUE
      AND organization_id = public.public_default_org_id()
    ORDER BY start_date ASC;

GRANT SELECT ON public_events TO anon, authenticated;

-- =====================================================
-- 5. Extend aggregate stats with real homepage counters
-- (volunteers, beneficiaries, events) so the hero +
-- impact sections never need hardcoded numbers.
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
               COALESCE(SUM(d.amount), 0) AS total_amount
        FROM public.donations d, org
        WHERE d.organization_id = org.id AND d.status = 'completed'
    ),
    projects AS (
        SELECT COUNT(*) AS active_projects FROM public.projects p, org
        WHERE p.organization_id = org.id AND p.status = 'active'
    ),
    campaigns AS (
        SELECT COUNT(*) AS active_campaigns FROM public.campaigns c, org
        WHERE c.organization_id = org.id AND c.status = 'active'
    ),
    volunteers AS (
        SELECT COUNT(*) AS total_volunteers FROM public.volunteers v, org
        WHERE v.organization_id = org.id AND v.status = 'active'
    ),
    beneficiaries AS (
        SELECT COALESCE(SUM(p.beneficiaries_reached), 0) AS total_beneficiaries
        FROM public.projects p, org
        WHERE p.organization_id = org.id AND p.status IN ('active', 'completed')
    ),
    events AS (
        SELECT COUNT(*) AS upcoming_events FROM public.org_events e, org
        WHERE e.organization_id = org.id
          AND e.status = 'published'
          AND e.is_public IS TRUE
          AND e.start_date >= NOW()
    )
    SELECT jsonb_build_object(
        'total_donations',    (SELECT total_donations FROM donations),
        'total_amount',       (SELECT total_amount FROM donations),
        'active_projects',    (SELECT active_projects FROM projects),
        'active_campaigns',   (SELECT active_campaigns FROM campaigns),
        'total_volunteers',   (SELECT total_volunteers FROM volunteers),
        'total_beneficiaries',(SELECT total_beneficiaries FROM beneficiaries),
        'upcoming_events',    (SELECT upcoming_events FROM events)
    );
$$;

GRANT EXECUTE ON FUNCTION public.public_impact_stats() TO anon, authenticated;
