-- Organization-managed auth and onboarding presentation content.
CREATE TABLE IF NOT EXISTS portal_experience_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	kind TEXT NOT NULL CHECK (kind IN ('auth_testimonial', 'auth_stat', 'onboarding_option')),
	item_key TEXT NOT NULL,
	label TEXT NOT NULL,
	description TEXT,
	value TEXT,
	icon TEXT,
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
	translations JSONB NOT NULL DEFAULT '{}'::jsonb,
	sort_order INTEGER NOT NULL DEFAULT 0,
	is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (organization_id, kind, item_key)
);

CREATE INDEX IF NOT EXISTS idx_portal_experience_public
	ON portal_experience_items (organization_id, kind, is_enabled, sort_order);

ALTER TABLE portal_experience_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_experience_public_read" ON portal_experience_items;
CREATE POLICY "portal_experience_public_read" ON portal_experience_items
	FOR SELECT USING (
		is_enabled = TRUE AND organization_id = public.public_default_org_id()
	);

DROP POLICY IF EXISTS "portal_experience_admin_read" ON portal_experience_items;
CREATE POLICY "portal_experience_admin_read" ON portal_experience_items
	FOR SELECT USING (public.user_has_permission(organization_id, 'settings.read'));

DROP POLICY IF EXISTS "portal_experience_admin_insert" ON portal_experience_items;
CREATE POLICY "portal_experience_admin_insert" ON portal_experience_items
	FOR INSERT WITH CHECK (public.user_has_permission(organization_id, 'settings.manage'));

DROP POLICY IF EXISTS "portal_experience_admin_update" ON portal_experience_items;
CREATE POLICY "portal_experience_admin_update" ON portal_experience_items
	FOR UPDATE USING (public.user_has_permission(organization_id, 'settings.manage'))
	WITH CHECK (public.user_has_permission(organization_id, 'settings.manage'));

DROP POLICY IF EXISTS "portal_experience_admin_delete" ON portal_experience_items;
CREATE POLICY "portal_experience_admin_delete" ON portal_experience_items
	FOR DELETE USING (public.user_has_permission(organization_id, 'settings.manage'));

GRANT SELECT ON portal_experience_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_experience_items TO authenticated;
