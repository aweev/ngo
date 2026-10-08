-- =====================================================
-- NGO OS - Content review authorization (audit Wave 0, item 1)
--
-- The application already separated three content capabilities in the
-- TypeScript permission registry (`content.manage`, `content.review`,
-- `content.publish`). This migration makes the database enforce the same
-- policy, so a direct PostgREST/PG call can never bypass the Server Action
-- guard:
--
--   1. `content_page_translations.reviewed_by` / `reviewed_at` give every
--      approval an attributable reviewer (auditability).
--   2. `role_has_permission()` gains `content.review` for managers.
--   3. The UPDATE RLS policy on translations accepts manage OR review OR
--      publish (a review-only custom role can record a decision).
--   4. `enforce_translation_review()` gates review-state transitions.
--   5. `enforce_content_workflow_state()` maps each content workflow state to
--      the capability required to enter it.
--
-- Threat model: these triggers constrain *tenant members* (callers that carry
-- an end-user JWT and therefore pass RLS). Requests without an end-user JWT --
-- service-role maintenance jobs, migrations, cron -- are trusted server-side
-- infrastructure and are governed by RLS/keys instead; the trigger is a no-op
-- for them so backfills and admin automations keep working.
-- =====================================================

-- -----------------------------------------------------
-- 1. Review provenance
-- -----------------------------------------------------
ALTER TABLE content_page_translations
    ADD COLUMN IF NOT EXISTS reviewed_by UUID,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN content_page_translations.reviewed_by IS
    'User who last approved this localized version (set by trigger, never by the client).';
COMMENT ON COLUMN content_page_translations.reviewed_at IS
    'When the approval was recorded (set by trigger).';

-- -----------------------------------------------------
-- 2. Permission model: content.review is a distinct capability
--    (mirrors src/lib/auth/permissions.ts)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.role_has_permission(p_role text, p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT CASE
        WHEN p_role IN ('owner', 'admin') THEN TRUE
        WHEN p_role = 'manager' THEN p_permission IN (
            'settings.read',
            'members.read',
            'workers.read', 'workers.manage',
            'volunteers.read', 'volunteers.manage', 'volunteers.approve_hours',
            'partners.read', 'partners.manage',
            'donors.read',
            'donations.read', 'donations.create',
            'projects.read', 'projects.manage',
            'campaigns.read', 'campaigns.manage',
            'events.read', 'events.manage',
            'forms.read', 'forms.manage',
            'impact.read', 'impact.manage',
            'content.read', 'content.manage', 'content.review',
            'messaging.read',
            'notifications.read',
            'tags.read', 'tags.manage',
            'finance.read',
            'reporting.read',
            'scheduling.read',
            'automations.read',
            'workflows.read',
            'governance.read'
        )
        WHEN p_role = 'member' THEN p_permission IN (
            'notifications.read',
            'messaging.read',
            'events.read'
        )
        ELSE FALSE
    END;
$$;

-- -----------------------------------------------------
-- 3. RLS: reviewers can update their locale rows
-- -----------------------------------------------------
DROP POLICY IF EXISTS perm_content_page_translations_update ON content_page_translations;
CREATE POLICY perm_content_page_translations_update ON content_page_translations
    FOR UPDATE
    USING (
        organization_id IS NOT NULL AND (
            public.user_has_permission(organization_id, 'content.manage')
            OR public.user_has_permission(organization_id, 'content.review')
            OR public.user_has_permission(organization_id, 'content.publish')
        )
    )
    WITH CHECK (
        organization_id IS NOT NULL AND (
            public.user_has_permission(organization_id, 'content.manage')
            OR public.user_has_permission(organization_id, 'content.review')
            OR public.user_has_permission(organization_id, 'content.publish')
        )
    );

-- -----------------------------------------------------
-- 4. Review-state transitions require content.review
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_translation_review()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_review_states text[] := ARRAY['in_review', 'approved'];
BEGIN
    -- No end-user JWT (service role, cron, migration) -> RLS/keys govern.
    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.status = ANY (v_review_states)
           AND NOT public.user_has_permission(NEW.organization_id, 'content.review') THEN
            RAISE EXCEPTION 'Requires content.review to insert a translation in a review state.';
        END IF;
        IF NEW.status = 'approved' THEN
            NEW.reviewed_by := auth.uid();
            NEW.reviewed_at := NOW();
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
       AND (NEW.status = ANY (v_review_states) OR OLD.status = ANY (v_review_states))
       AND NOT (
            public.user_has_permission(NEW.organization_id, 'content.review')
            OR public.user_has_permission(NEW.organization_id, 'content.publish')
       ) THEN
        RAISE EXCEPTION 'Requires content.review (or content.publish) to change a translation review state.';
    END IF;

    -- Approval provenance is written by the database, not by the caller.
    IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
        NEW.reviewed_by := auth.uid();
        NEW.reviewed_at := NOW();
    ELSIF NEW.status <> 'approved' AND OLD.status = 'approved' THEN
        NEW.reviewed_by := NULL;
        NEW.reviewed_at := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_translation_review ON content_page_translations;
CREATE TRIGGER trg_enforce_translation_review
    BEFORE INSERT OR UPDATE ON content_page_translations
    FOR EACH ROW EXECUTE FUNCTION public.enforce_translation_review();

-- -----------------------------------------------------
-- 5. Workflow-state transitions on the master page
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_content_workflow_state()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_required text;
BEGIN
    IF TG_OP <> 'UPDATE' OR NEW.workflow_state IS NOT DISTINCT FROM OLD.workflow_state THEN
        RETURN NEW;
    END IF;

    IF auth.uid() IS NULL THEN
        RETURN NEW;
    END IF;

    v_required := CASE NEW.workflow_state
        WHEN 'published'           THEN 'content.publish'
        WHEN 'approved'            THEN 'content.review'
        WHEN 'changes_requested'   THEN 'content.review'
        WHEN 'in_review'           THEN 'content.review'
        WHEN 'translation_pending' THEN 'content.manage'
        WHEN 'draft'               THEN 'content.manage'
        WHEN 'archived'            THEN 'content.manage'
        ELSE 'content.manage'
    END;

    IF NOT public.user_has_permission(NEW.organization_id, v_required) THEN
        RAISE EXCEPTION 'Requires % to move a content page to workflow state ''%''.', v_required, NEW.workflow_state;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_content_workflow_state ON content_pages;
CREATE TRIGGER trg_enforce_content_workflow_state
    BEFORE UPDATE ON content_pages
    FOR EACH ROW EXECUTE FUNCTION public.enforce_content_workflow_state();

-- -----------------------------------------------------
-- 6. Documentation for operators / API clients
-- -----------------------------------------------------
COMMENT ON FUNCTION public.enforce_translation_review() IS
    'Wave 0: translation review transitions require content.review (or content.publish).';
COMMENT ON FUNCTION public.enforce_content_workflow_state() IS
    'Wave 0: content_pages.workflow_state transitions require the matching content capability.';
