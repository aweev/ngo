-- =====================================================
-- P0 production gate: newsletter double opt-in, donation consent,
-- form routing/escalation, editorial entity translations.
-- =====================================================

-- 1. Newsletter double opt-in: pending state + token + consent proof.
ALTER TABLE newsletter_subscribers DROP CONSTRAINT IF EXISTS newsletter_subscribers_status_check;
ALTER TABLE newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_status_check
    CHECK (status IN ('pending', 'subscribed', 'unsubscribed', 'bounced'));
ALTER TABLE newsletter_subscribers ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE newsletter_subscribers
    ADD COLUMN IF NOT EXISTS confirmation_token UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS confirmation_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS consent_source TEXT NOT NULL DEFAULT 'website';
CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_confirmation_token
    ON newsletter_subscribers(confirmation_token) WHERE confirmation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(organization_id, status);

-- 2. Donation consent (GDPR proof) + pledge comms.
ALTER TABLE donations
    ADD COLUMN IF NOT EXISTS consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pledge_notified_at TIMESTAMPTZ;
ALTER TABLE donors
    ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;

-- 3. Form routing + safeguarding escalation tracking.
ALTER TABLE form_submissions
    ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'normal'
        CHECK (severity IN ('normal', 'high', 'urgent')),
    ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS assignee TEXT;
CREATE INDEX IF NOT EXISTS idx_form_submissions_routing
    ON form_submissions(organization_id, form_slug, status);

-- 4. Editorial entity translations: news, stories, volunteer roles.
-- Existing CHECK only allows 6 types; extend without losing data.
ALTER TABLE entity_translations DROP CONSTRAINT IF EXISTS entity_translations_entity_type_check;
ALTER TABLE entity_translations
    ADD CONSTRAINT entity_translations_entity_type_check
    CHECK (entity_type IN (
        'campaign', 'project', 'partner',
        'impact_metric', 'org_event', 'organization',
        'news_article', 'impact_story', 'volunteer_role'
    ));

-- Publish-gate trigger: map new types to owning permissions.
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
        WHEN 'news_article' THEN 'content.manage'
        WHEN 'impact_story' THEN 'content.manage'
        WHEN 'volunteer_role' THEN 'content.manage'
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

-- RLS: extend read/write to content roles for editorial types (idempotent re-create).
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

-- 5. Retention: purge unconfirmed double-opt-in rows after token expiry.
-- Unconfirmed addresses carry no consent and must not accumulate.
CREATE OR REPLACE FUNCTION public.purge_expired_newsletter_pending()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_deleted int := 0;
BEGIN
    DELETE FROM public.newsletter_subscribers
    WHERE status = 'pending'
      AND confirmation_expires_at IS NOT NULL
      AND confirmation_expires_at < NOW() - INTERVAL '48 hours';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_newsletter_pending() FROM PUBLIC, anon, authenticated;

-- Daily purge via pg_cron when available (otherwise run the function from
-- the cron-runner edge function or a manual VACUUM-analog maintenance call).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron')
       AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-newsletter-pending-daily') THEN
            PERFORM cron.unschedule('purge-newsletter-pending-daily');
        END IF;
        PERFORM cron.schedule('purge-newsletter-pending-daily', '0 3 * * *', 'SELECT public.purge_expired_newsletter_pending();');
    END IF;
END;
$$;
