-- =====================================================
-- NGO OS - Entity translations for all public content
-- Extends the migration-22 page model to every other public
-- entity used on the home/About pages:
--   campaigns, projects, partners, impact_metrics,
--   org_events, organizations.
--
-- Design: one generic table (entity_type + entity_id + locale)
-- with a typed JSONB `fields` payload. Per-entity field shapes
-- are enforced in TypeScript (src/lib/content/entity-translations.ts),
-- not CHECK constraints, so new entities don't need DDL.
--
-- Publish protection: only rows with status='published' are
-- exposed via public_entity_translations. The trigger requires
-- the owning module's manage permission (or content.publish)
-- plus a non-empty display name per entity type.
-- =====================================================

CREATE TABLE IF NOT EXISTS entity_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'campaign', 'project', 'partner',
        'impact_metric', 'org_event', 'organization'
    )),
    entity_id UUID NOT NULL,
    locale TEXT NOT NULL CHECK (locale IN ('en', 'de', 'fr', 'es', 'ar')),
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'machine_translated', 'in_review', 'approved', 'published')),
    fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
    assigned_to UUID,
    source TEXT NOT NULL DEFAULT 'human'
        CHECK (source IN ('human', 'ai', 'import')),
    last_translated_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entity_type, entity_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_entity_translations_lookup
    ON entity_translations(organization_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_translations_locale
    ON entity_translations(entity_type, entity_id, locale);
CREATE INDEX IF NOT EXISTS idx_entity_translations_status
    ON entity_translations(organization_id, status);

-- updated_at maintenance
DROP TRIGGER IF EXISTS update_entity_translations_updated_at ON entity_translations;
CREATE TRIGGER update_entity_translations_updated_at
    BEFORE UPDATE ON entity_translations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- org_id immutability
DROP TRIGGER IF EXISTS trg_prevent_org_change ON entity_translations;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON entity_translations
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

-- Version bump on fields change
CREATE OR REPLACE FUNCTION public.bump_entity_translation_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.fields IS DISTINCT FROM OLD.fields THEN
        NEW.version := COALESCE(OLD.version, 1) + 1;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_entity_translation_version ON entity_translations;
CREATE TRIGGER trg_bump_entity_translation_version
    BEFORE UPDATE ON entity_translations
    FOR EACH ROW EXECUTE FUNCTION public.bump_entity_translation_version();

-- Publish gate: entering/leaving 'published' requires the owning
-- module's manage permission (campaigns.manage, projects.manage,
-- partners.manage, impact.manage, events.manage, settings.manage
-- for organizations) or content.publish (CMS editors). Publishing
-- also requires a non-empty display field so untranslated content
-- can never go live.
CREATE OR REPLACE FUNCTION public.enforce_entity_translation_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_perm text;
    v_name text;
BEGIN
    v_perm := CASE NEW.entity_type
        WHEN 'campaign' THEN 'campaigns.manage'
        WHEN 'project' THEN 'projects.manage'
        WHEN 'partner' THEN 'partners.manage'
        WHEN 'impact_metric' THEN 'impact.manage'
        WHEN 'org_event' THEN 'events.manage'
        WHEN 'organization' THEN 'settings.manage'
        ELSE 'content.manage'
    END;

    IF NEW.status IS DISTINCT FROM OLD.status
       AND (NEW.status = 'published' OR OLD.status = 'published')
       AND NOT (
            public.user_has_permission(NEW.organization_id, v_perm)
            OR public.user_has_permission(NEW.organization_id, 'content.publish')
       ) THEN
        RAISE EXCEPTION 'Requires % (or content.publish) to publish or unpublish a % translation.', v_perm, NEW.entity_type;
    END IF;

    IF NEW.status = 'published' THEN
        v_name := COALESCE(
            NULLIF(btrim(COALESCE(NEW.fields->>'name', '')), ''),
            NULLIF(btrim(COALESCE(NEW.fields->>'title', '')), '')
        );
        IF v_name IS NULL THEN
            RAISE EXCEPTION 'Cannot publish a % translation without a name/title.', NEW.entity_type;
        END IF;
        IF NEW.published_at IS NULL THEN
            NEW.published_at := NOW();
        END IF;
    ELSE
        NEW.published_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_entity_translation_publish ON entity_translations;
CREATE TRIGGER trg_enforce_entity_translation_publish
    BEFORE INSERT OR UPDATE ON entity_translations
    FOR EACH ROW EXECUTE FUNCTION public.enforce_entity_translation_publish();

-- =====================================================
-- RLS: read needs any relevant read permission; write needs
-- the owning module's manage permission or content.manage.
-- (add_tenant_policies supports one permission pair, so custom
-- policies are defined here.)
-- =====================================================
ALTER TABLE entity_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS entity_translations_select ON entity_translations;
CREATE POLICY entity_translations_select ON entity_translations
    FOR SELECT USING (
        public.user_has_permission(organization_id, 'content.read')
        OR public.user_has_permission(organization_id, 'campaigns.read')
        OR public.user_has_permission(organization_id, 'projects.read')
        OR public.user_has_permission(organization_id, 'partners.read')
        OR public.user_has_permission(organization_id, 'impact.read')
        OR public.user_has_permission(organization_id, 'events.read')
        OR public.user_has_permission(organization_id, 'settings.read')
    );

DROP POLICY IF EXISTS entity_translations_insert ON entity_translations;
CREATE POLICY entity_translations_insert ON entity_translations
    FOR INSERT WITH CHECK (
        public.user_has_permission(organization_id, 'content.manage')
        OR public.user_has_permission(organization_id, 'campaigns.manage')
        OR public.user_has_permission(organization_id, 'projects.manage')
        OR public.user_has_permission(organization_id, 'partners.manage')
        OR public.user_has_permission(organization_id, 'impact.manage')
        OR public.user_has_permission(organization_id, 'events.manage')
        OR public.user_has_permission(organization_id, 'settings.manage')
    );

DROP POLICY IF EXISTS entity_translations_update ON entity_translations;
CREATE POLICY entity_translations_update ON entity_translations
    FOR UPDATE USING (
        public.user_has_permission(organization_id, 'content.manage')
        OR public.user_has_permission(organization_id, 'campaigns.manage')
        OR public.user_has_permission(organization_id, 'projects.manage')
        OR public.user_has_permission(organization_id, 'partners.manage')
        OR public.user_has_permission(organization_id, 'impact.manage')
        OR public.user_has_permission(organization_id, 'events.manage')
        OR public.user_has_permission(organization_id, 'settings.manage')
        OR public.user_has_permission(organization_id, 'content.publish')
    ) WITH CHECK (
        public.user_has_permission(organization_id, 'content.manage')
        OR public.user_has_permission(organization_id, 'campaigns.manage')
        OR public.user_has_permission(organization_id, 'projects.manage')
        OR public.user_has_permission(organization_id, 'partners.manage')
        OR public.user_has_permission(organization_id, 'impact.manage')
        OR public.user_has_permission(organization_id, 'events.manage')
        OR public.user_has_permission(organization_id, 'settings.manage')
        OR public.user_has_permission(organization_id, 'content.publish')
    );

DROP POLICY IF EXISTS entity_translations_delete ON entity_translations;
CREATE POLICY entity_translations_delete ON entity_translations
    FOR DELETE USING (
        public.user_has_permission(organization_id, 'content.manage')
        OR public.user_has_permission(organization_id, 'campaigns.manage')
        OR public.user_has_permission(organization_id, 'projects.manage')
        OR public.user_has_permission(organization_id, 'partners.manage')
        OR public.user_has_permission(organization_id, 'impact.manage')
        OR public.user_has_permission(organization_id, 'events.manage')
        OR public.user_has_permission(organization_id, 'settings.manage')
    );

-- =====================================================
-- Anon-safe public projection: published rows only,
-- default org only. No drafts, no machine output, no PII.
-- =====================================================
DROP VIEW IF EXISTS public_entity_translations CASCADE;
CREATE VIEW public_entity_translations AS
    SELECT entity_type, entity_id, locale, fields,
           version, published_at, updated_at
    FROM entity_translations
    WHERE status = 'published'
      AND organization_id = public.public_default_org_id();

GRANT SELECT ON public_entity_translations TO anon, authenticated;
