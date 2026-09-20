-- =====================================================
-- NGO OS - Local seed (runs on `supabase db reset` ONLY)
-- Never applied by `supabase db push`, so production always
-- starts empty and goes through the /auth/setup bootstrap wizard.
--
-- Creates the default organization flagged as the public site
-- (see public_default_org_id()). Staff personas are NOT seeded
-- here — run `pnpm seed:personas` after reset to create
-- owner@ / admin@ / manager@ / member@ test accounts.
-- =====================================================

INSERT INTO organizations (name, slug, description, email, country, settings)
VALUES (
    'AWE e.V.',
    'awe-ev',
    'Dignified Growth & Radiant Community',
    'contact@awe-ev.org',
    'DE',
    '{"public_site": true}'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
    settings = organizations.settings || '{"public_site": true}'::jsonb,
    updated_at = NOW();
