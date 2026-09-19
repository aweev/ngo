-- =====================================================
-- NGO OS - Organization-ID Immutability Guard
-- =====================================================
-- Phase 2, item 18: prevents any UPDATE from changing a record's
-- organization_id, on every organization-owned (tenant) table.
--
-- This is enforced at the database level by a BEFORE UPDATE trigger so it
-- holds regardless of how the UPDATE arrives (RLS WITH CHECK is a second,
-- policy-level defense; this trigger is the hard guarantee).
--
-- The trigger only fires when organization_id is actually changing, so
-- normal updates are free of overhead.

CREATE OR REPLACE FUNCTION public.prevent_org_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
        RAISE EXCEPTION 'organization_id is immutable and cannot be changed.';
    END IF;
    RETURN NEW;
END;
$$;

-- Apply the trigger to every tenant table. Skipping tables without an
-- organization_id column (e.g. organizations itself) is intentional and
-- safe: the trigger is created only on the listed tables.
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'organization_members',
        'workers', 'volunteers', 'volunteer_hours',
        'partners', 'donors', 'donations',
        'projects', 'campaigns',
        'invitations', 'form_submissions', 'newsletter_subscribers',
        'notification_templates', 'notifications', 'notification_preferences',
        'integrations', 'webhooks', 'webhook_deliveries',
        'custom_roles', 'role_assignments', 'permission_overrides',
        'scheduled_jobs', 'job_executions',
        'report_definitions', 'report_snapshots',
        'content_pages', 'content_blocks', 'media_library',
        'org_events', 'event_registrations',
        'tags', 'tag_assignments',
        'conversations', 'conversation_messages',
        'impact_metrics', 'impact_measurements', 'impact_goals',
        'budgets', 'budget_lines', 'expenses',
        'feature_flags', 'governance_approvals', 'performance_reviews', 'hr_lifecycle_records',
        'automation_rules', 'automation_executions', 'automation_templates',
        'workflow_definitions', 'workflow_instances', 'workflow_steps',
        'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_prevent_org_change ON %I;', tbl);
        EXECUTE format('CREATE TRIGGER trg_prevent_org_change BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();', tbl);
    END LOOP;
END $$;

-- =====================================================
-- Done.
-- =====================================================