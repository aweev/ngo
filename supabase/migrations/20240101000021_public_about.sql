-- =====================================================
-- NGO OS - Public about-page projections
-- Powers /about, /about/team, /about/partners, /about/financials
-- entirely from the admin command center.
-- Follows the same pattern as 20240101000018_public_views.sql
-- and 20240101000020_public_homepage.sql: narrow views /
-- SECURITY DEFINER functions scoped to public_default_org_id(),
-- granted to anon + authenticated. No private columns leak.
--
-- Team / milestones / documents reuse public_content_pages
-- (categories: team_member, milestone, document) so no new
-- tables are needed — admins manage them in /admin/content.
-- =====================================================

-- =====================================================
-- 1. Public organization profile (safe columns only)
-- No email/phone/tax/registration internals.
-- =====================================================
DROP VIEW IF EXISTS public_organization CASCADE;
CREATE VIEW public_organization AS
    SELECT id, name, slug, description, website,
           logo_url, founded_date, city, country,
           settings, created_at
    FROM organizations
    WHERE id = public.public_default_org_id();

GRANT SELECT ON public_organization TO anon, authenticated;

-- =====================================================
-- 2. Public financial summary (org-level aggregates only)
-- Transparency totals for /about/financials. No per-row
-- exposure of donations / budgets / expenses.
-- =====================================================
CREATE OR REPLACE FUNCTION public.public_financial_summary()
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
        SELECT COALESCE(SUM(amount), 0) AS total_revenue,
               COUNT(*) AS donation_count
        FROM donations d, org
        WHERE d.organization_id = org.id AND d.status = 'completed'
    ),
    expenses AS (
        SELECT COALESCE(SUM(amount), 0) AS total_expenses,
               COALESCE(SUM(amount) FILTER (WHERE category ILIKE '%program%' OR category ILIKE '%project%'), 0) AS program_expenses,
               COALESCE(SUM(amount) FILTER (WHERE category ILIKE '%manage%' OR category ILIKE '%admin%' OR category ILIKE '%operation%'), 0) AS management_expenses,
               COALESCE(SUM(amount) FILTER (WHERE category ILIKE '%fundrais%'), 0) AS fundraising_expenses
        FROM expenses e, org
        WHERE e.organization_id = org.id AND e.status IN ('approved', 'paid')
    ),
    budgets AS (
        SELECT COALESCE(SUM(total_amount), 0) AS total_budget,
               COUNT(*) AS budget_count
        FROM budgets b, org
        WHERE b.organization_id = org.id AND b.status IN ('approved', 'active')
    )
    SELECT jsonb_build_object(
        'total_revenue',      (SELECT total_revenue FROM donations),
        'donation_count',     (SELECT donation_count FROM donations),
        'total_expenses',     (SELECT total_expenses FROM expenses),
        'program_expenses',   (SELECT program_expenses FROM expenses),
        'management_expenses',(SELECT management_expenses FROM expenses),
        'fundraising_expenses',(SELECT fundraising_expenses FROM expenses),
        'total_budget',       (SELECT total_budget FROM budgets),
        'budget_count',       (SELECT budget_count FROM budgets),
        'efficiency_ratio',   CASE
            WHEN (SELECT total_expenses FROM expenses) > 0
            THEN (SELECT program_expenses FROM expenses) / (SELECT total_expenses FROM expenses)
            ELSE 0
        END
    );
$$;

GRANT EXECUTE ON FUNCTION public.public_financial_summary() TO anon, authenticated;
