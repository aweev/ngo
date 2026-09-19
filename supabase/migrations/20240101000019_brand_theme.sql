-- =====================================================
-- NGO OS - Public brand theme default
-- Exposes ONLY the organization's default brand theme id
-- ('sunset' | 'ocean') to anonymous visitors so the public
-- site can render the admin-chosen default before paint.
-- No other settings are exposed. Follows the same pattern
-- as public_default_org_id() / public_impact_stats().
-- The value is stored in organizations.settings->>'brand_theme'
-- and managed by admins via the Settings > Branding tab
-- (requires the 'settings.manage' permission for writes).
-- =====================================================

CREATE OR REPLACE FUNCTION public.public_org_brand_theme()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    theme text;
BEGIN
    SELECT settings->>'brand_theme' INTO theme
    FROM organizations
    WHERE id = public.public_default_org_id();

    IF theme IS NULL OR theme NOT IN ('sunset', 'ocean') THEN
        RETURN 'sunset';
    END IF;

    RETURN theme;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_org_brand_theme() TO anon, authenticated;
