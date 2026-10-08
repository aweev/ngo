-- =====================================================
-- NGO OS - Public brand experience
--
-- A public visitor may learn only the safe, reviewed visual configuration for
-- the designated public organization: its base theme and, when currently
-- active, a whitelisted campaign identifier. No organization settings, dates,
-- tenant identifiers, or internal data are exposed.
--
-- The project currently resolves one designated public organization via
-- public_default_org_id(). Domain-to-tenant routing is deliberately a later
-- deployment boundary, not a reason to expose all tenant settings here.
-- =====================================================

CREATE OR REPLACE FUNCTION public.public_org_brand_experience()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $fn$
DECLARE
    v_settings jsonb := '{}'::jsonb;
    v_base_theme text := 'sunset';
    v_campaign_id text;
    v_starts_at timestamptz;
    v_ends_at timestamptz;
BEGIN
    SELECT COALESCE(settings, '{}'::jsonb)
      INTO v_settings
      FROM public.organizations
     WHERE id = public.public_default_org_id();

    IF v_settings->>'brand_theme' IN ('sunset', 'ocean') THEN
        v_base_theme := v_settings->>'brand_theme';
    END IF;

    -- Treat malformed or incomplete schedules as inactive. Public rendering
    -- must be fail-safe: a bad admin setting cannot break the site.
    v_campaign_id := v_settings->'brand_campaign'->>'id';
    BEGIN
        v_starts_at := NULLIF(v_settings->'brand_campaign'->>'starts_at', '')::timestamptz;
        v_ends_at := NULLIF(v_settings->'brand_campaign'->>'ends_at', '')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
        v_starts_at := NULL;
        v_ends_at := NULL;
    END;

    IF v_campaign_id NOT IN ('year-end', 'community-week')
       OR v_starts_at IS NULL
       OR v_ends_at IS NULL
       OR v_starts_at >= v_ends_at
       OR CURRENT_TIMESTAMP < v_starts_at
       OR CURRENT_TIMESTAMP >= v_ends_at THEN
        v_campaign_id := NULL;
    END IF;

    RETURN jsonb_build_object(
        'base_theme', v_base_theme,
        'campaign_id', v_campaign_id
    );
END;
$fn$;

REVOKE ALL ON FUNCTION public.public_org_brand_experience() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_org_brand_experience() TO anon, authenticated;
