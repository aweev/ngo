-- =====================================================
-- NGO OS - Permission-Aware Row Level Security (RLS)
-- =====================================================
-- Phase 2: Make Multi-Tenancy Secure.
--
-- This file SUPERSEDES the generic tenant-isolation policies created by
-- schema-rls.sql, schema-rls-part2.sql, fix-rls-recursion.sql and the
-- previous version of this file. Run AFTER all schema files.
--
-- What changed:
--   * Every policy is permission-aware: a user can read a table only when
--     their org role grants the matching `<module>.read` permission, and
--     can insert/update/delete only with `<module>.manage`.
--   * role_has_permission() mirrors src/lib/auth/permissions.ts EXACTLY so
--     UI, Server Actions, and the database share one policy engine.
--   * INSERT/UPDATE policies all carry WITH CHECK so users can never write
--     rows into (or move rows into) an organization they cannot manage.
--   * audit_logs is read-only (audit.read) and no longer writable by
--     authenticated users (service role only).
--
-- The org_id immutability trigger lives in schema-org-protection.sql.
-- Storage policies live in schema-storage-v2.sql.

-- =====================================================
-- 1. Permission helper functions (SECURITY DEFINER avoids RLS recursion)
-- =====================================================

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
            'content.read', 'content.manage',
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
CREATE OR REPLACE FUNCTION public.user_has_permission(p_org_id uuid, p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.role_has_permission(om.role, p_permission)
    FROM public.organization_members om
    WHERE om.organization_id = p_org_id AND om.user_id = auth.uid();
$$;

-- Org membership check (kept for compatibility; used for SELECT on orgs).
CREATE OR REPLACE FUNCTION public.user_has_org_access(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS(
        SELECT 1 FROM public.organization_members
        WHERE organization_id = p_org_id AND user_id = auth.uid()
    );
$$;

-- =====================================================
-- 2. Drop all legacy (generic) policies so the new ones below are the
--    only policies in effect. Idempotent.
-- =====================================================

-- Base tables from schema-rls.sql / schema-rls-part2.sql / fix-rls-recursion.sql
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Owners can update organization" ON organizations;
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Users can view workers" ON workers;
DROP POLICY IF EXISTS "Admins can manage workers" ON workers;
DROP POLICY IF EXISTS "Users can view volunteers" ON volunteers;
DROP POLICY IF EXISTS "Admins can manage volunteers" ON volunteers;
DROP POLICY IF EXISTS "Users can view partners" ON partners;
DROP POLICY IF EXISTS "Admins can manage partners" ON partners;
DROP POLICY IF EXISTS "Users can view donors" ON donors;
DROP POLICY IF EXISTS "Admins can manage donors" ON donors;
DROP POLICY IF EXISTS "Users can view donations" ON donations;
DROP POLICY IF EXISTS "Admins can manage donations" ON donations;
DROP POLICY IF EXISTS "Users can view projects" ON projects;
DROP POLICY IF EXISTS "Admins can manage projects" ON projects;
DROP POLICY IF EXISTS "Users can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can manage campaigns" ON campaigns;
DROP POLICY IF EXISTS "Users can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Public-access policies from schema-public-access.sql (replaced by the
-- safe projections in schema-public-views.sql).
DROP POLICY IF EXISTS "Public can view active campaigns" ON campaigns;
DROP POLICY IF EXISTS "Public can view active projects" ON projects;
DROP POLICY IF EXISTS "Public can view active partners" ON partners;
DROP POLICY IF EXISTS "Public can view completed donations count" ON donations;
DROP POLICY IF EXISTS "Public can view active donors" ON donors;
-- Generic tenant isolation policies on extended tables
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'automation_rules', 'automation_executions', 'automation_templates',
        'workflow_definitions', 'workflow_instances', 'workflow_steps',
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
        'feature_flags', 'governance_approvals', 'performance_reviews', 'hr_lifecycle_records'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select" ON %I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_insert" ON %I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_update" ON %I;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_delete" ON %I;', tbl);
    END LOOP;
END $$;

-- =====================================================
-- 3. Policy generator
-- =====================================================
-- Creates the four standard permission-aware policies for a tenant table.
--   p_read  : permission required to SELECT
--   p_manage: permission required to INSERT/UPDATE/DELETE
--   p_update_extra: optional second permission allowed for UPDATE
--                   (e.g. content.publish, finance.approve)
--   p_nullable_org: allow NULL organization_id rows (system-level records)
CREATE OR REPLACE FUNCTION public.add_tenant_policies(
    p_tbl text,
    p_read text,
    p_manage text,
    p_update_extra text DEFAULT NULL,
    p_nullable_org boolean DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_ok text;
    v_update_using text;
BEGIN
    IF p_nullable_org THEN
        v_org_ok := format('(organization_id IS NULL OR (organization_id IS NOT NULL AND public.user_has_permission(organization_id, %1$L)))', p_read);
    ELSE
        v_org_ok := format('(organization_id IS NOT NULL AND public.user_has_permission(organization_id, %1$L))', p_read);
    END IF;

    IF p_update_extra IS NULL THEN
        v_update_using := format('(organization_id IS NOT NULL AND public.user_has_permission(organization_id, %1$L))', p_manage);
    ELSE
        v_update_using := format('(organization_id IS NOT NULL AND (public.user_has_permission(organization_id, %1$L) OR public.user_has_permission(organization_id, %2$L)))', p_manage, p_update_extra);
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'perm_' || p_tbl || '_select', p_tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (%s);', 'perm_' || p_tbl || '_select', p_tbl, v_org_ok);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'perm_' || p_tbl || '_insert', p_tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (%s);',
        'perm_' || p_tbl || '_insert', p_tbl,
        format('(organization_id IS NOT NULL AND public.user_has_permission(organization_id, %1$L))', p_manage));

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'perm_' || p_tbl || '_update', p_tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (%s) WITH CHECK (%s);',
        'perm_' || p_tbl || '_update', p_tbl, v_update_using, v_update_using);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'perm_' || p_tbl || '_delete', p_tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (%s);',
        'perm_' || p_tbl || '_delete', p_tbl,
        format('(organization_id IS NOT NULL AND public.user_has_permission(organization_id, %1$L))', p_manage));
END;
$$;
-- =====================================================
-- 4. Apply permission-aware policies
-- =====================================================

-- People & programs (members can read; managers+ can manage)
SELECT public.add_tenant_policies('workers', 'workers.read', 'workers.manage');
SELECT public.add_tenant_policies('volunteers', 'volunteers.read', 'volunteers.manage');
SELECT public.add_tenant_policies('volunteer_hours', 'volunteers.read', 'volunteers.manage', 'volunteers.approve_hours');
SELECT public.add_tenant_policies('partners', 'partners.read', 'partners.manage');
SELECT public.add_tenant_policies('donors', 'donors.read', 'donors.manage');

-- Donations (create is sufficient to record a donation; manage to change it)
SELECT public.add_tenant_policies('donations', 'donations.read', 'donations.manage');

-- Projects & campaigns
SELECT public.add_tenant_policies('projects', 'projects.read', 'projects.manage');
SELECT public.add_tenant_policies('campaigns', 'campaigns.read', 'campaigns.manage');

-- Events
SELECT public.add_tenant_policies('org_events', 'events.read', 'events.manage');
SELECT public.add_tenant_policies('event_registrations', 'events.read', 'events.manage');

-- Content (publishing status changes requires content.publish)
SELECT public.add_tenant_policies('content_pages', 'content.read', 'content.manage', 'content.publish');
SELECT public.add_tenant_policies('content_blocks', 'content.read', 'content.manage');
SELECT public.add_tenant_policies('media_library', 'content.read', 'content.manage');

-- Finance (approvals require finance.approve)
SELECT public.add_tenant_policies('budgets', 'finance.read', 'finance.manage');
SELECT public.add_tenant_policies('budget_lines', 'finance.read', 'finance.manage');
SELECT public.add_tenant_policies('expenses', 'finance.read', 'finance.manage', 'finance.approve');

-- Impact
SELECT public.add_tenant_policies('impact_metrics', 'impact.read', 'impact.manage');
SELECT public.add_tenant_policies('impact_measurements', 'impact.read', 'impact.manage');
SELECT public.add_tenant_policies('impact_goals', 'impact.read', 'impact.manage');

-- Notifications & messaging
SELECT public.add_tenant_policies('notification_templates', 'notifications.read', 'notifications.manage', NULL, TRUE);
SELECT public.add_tenant_policies('notifications', 'notifications.read', 'notifications.manage');
SELECT public.add_tenant_policies('conversations', 'messaging.read', 'messaging.manage');
SELECT public.add_tenant_policies('conversation_messages', 'messaging.read', 'messaging.manage');

-- Tags
SELECT public.add_tenant_policies('tags', 'tags.read', 'tags.manage');
SELECT public.add_tenant_policies('tag_assignments', 'tags.read', 'tags.manage');

-- Reporting, scheduling, automations, workflows
SELECT public.add_tenant_policies('report_definitions', 'reporting.read', 'reporting.manage');
SELECT public.add_tenant_policies('report_snapshots', 'reporting.read', 'reporting.manage');
SELECT public.add_tenant_policies('scheduled_jobs', 'scheduling.read', 'scheduling.manage');
SELECT public.add_tenant_policies('job_executions', 'scheduling.read', 'scheduling.manage');
SELECT public.add_tenant_policies('automation_rules', 'automations.read', 'automations.manage');
SELECT public.add_tenant_policies('automation_executions', 'automations.read', 'automations.manage');
SELECT public.add_tenant_policies('automation_templates', 'automations.read', 'automations.manage', NULL, TRUE);
SELECT public.add_tenant_policies('workflow_definitions', 'workflows.read', 'workflows.manage');
SELECT public.add_tenant_policies('workflow_instances', 'workflows.read', 'workflows.manage');
SELECT public.add_tenant_policies('workflow_steps', 'workflows.read', 'workflows.manage');

-- Integrations
SELECT public.add_tenant_policies('integrations', 'integrations.read', 'integrations.manage');
SELECT public.add_tenant_policies('webhooks', 'integrations.read', 'integrations.manage');
SELECT public.add_tenant_policies('webhook_deliveries', 'integrations.read', 'integrations.manage');

-- Governance
SELECT public.add_tenant_policies('feature_flags', 'governance.read', 'governance.manage');
SELECT public.add_tenant_policies('governance_approvals', 'governance.read', 'governance.manage');
SELECT public.add_tenant_policies('performance_reviews', 'governance.read', 'governance.manage');
SELECT public.add_tenant_policies('hr_lifecycle_records', 'governance.read', 'governance.manage');

-- RBAC (owner/admin only via the manage permission)
SELECT public.add_tenant_policies('custom_roles', 'rbac.read', 'rbac.manage');
SELECT public.add_tenant_policies('role_assignments', 'rbac.read', 'rbac.manage');
-- =====================================================
-- 5. Special-case policies
-- =====================================================

-- Organizations: members can view; only settings.manage can update;
-- creation/removal stays with the platform (seeding / service role).
DROP POLICY IF EXISTS "perm_organizations_select" ON organizations;
CREATE POLICY "perm_organizations_select" ON organizations
    FOR SELECT USING (public.user_has_org_access(id));

DROP POLICY IF EXISTS "perm_organizations_update" ON organizations;
CREATE POLICY "perm_organizations_update" ON organizations
    FOR UPDATE USING (public.user_has_permission(id, 'settings.manage'))
    WITH CHECK (public.user_has_permission(id, 'settings.manage'));

-- Organization members: read roster, manage memberships (manage permission)
DROP POLICY IF EXISTS "perm_organization_members_select" ON organization_members;
CREATE POLICY "perm_organization_members_select" ON organization_members
    FOR SELECT USING (
        public.user_has_permission(organization_id, 'members.read')
    );

DROP POLICY IF EXISTS "perm_organization_members_insert" ON organization_members;
CREATE POLICY "perm_organization_members_insert" ON organization_members
    FOR INSERT WITH CHECK (
        public.user_has_permission(organization_id, 'members.manage')
    );

DROP POLICY IF EXISTS "perm_organization_members_update" ON organization_members;
CREATE POLICY "perm_organization_members_update" ON organization_members
    FOR UPDATE USING (public.user_has_permission(organization_id, 'members.manage'))
    WITH CHECK (public.user_has_permission(organization_id, 'members.manage'));

DROP POLICY IF EXISTS "perm_organization_members_delete" ON organization_members;
CREATE POLICY "perm_organization_members_delete" ON organization_members
    FOR DELETE USING (public.user_has_permission(organization_id, 'members.manage'));

-- Invitations: read roster-level; manage to create/revoke
SELECT public.add_tenant_policies('invitations', 'members.read', 'members.manage');

-- Form submissions: any visitor may submit; staff read; manage to update.
DROP POLICY IF EXISTS "Public can submit forms" ON form_submissions;
CREATE POLICY "Public can submit forms" ON form_submissions
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "perm_form_submissions_select" ON form_submissions;
CREATE POLICY "perm_form_submissions_select" ON form_submissions
    FOR SELECT USING (
        organization_id IS NULL OR public.user_has_permission(organization_id, 'forms.read')
    );

DROP POLICY IF EXISTS "perm_form_submissions_update" ON form_submissions;
CREATE POLICY "perm_form_submissions_update" ON form_submissions
    FOR UPDATE USING (public.user_has_permission(organization_id, 'forms.manage'))
    WITH CHECK (public.user_has_permission(organization_id, 'forms.manage'));

DROP POLICY IF EXISTS "perm_form_submissions_delete" ON form_submissions;
CREATE POLICY "perm_form_submissions_delete" ON form_submissions
    FOR DELETE USING (public.user_has_permission(organization_id, 'forms.manage'));

-- Newsletter subscribers: any visitor may subscribe; staff read.
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON newsletter_subscribers;
CREATE POLICY "Public can subscribe to newsletter" ON newsletter_subscribers
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "perm_newsletter_subscribers_select" ON newsletter_subscribers;
CREATE POLICY "perm_newsletter_subscribers_select" ON newsletter_subscribers
    FOR SELECT USING (
        organization_id IS NULL OR public.user_has_permission(organization_id, 'notifications.read')
    );

DROP POLICY IF EXISTS "perm_newsletter_subscribers_update" ON newsletter_subscribers;
CREATE POLICY "perm_newsletter_subscribers_update" ON newsletter_subscribers
    FOR UPDATE USING (public.user_has_permission(organization_id, 'notifications.manage'))
    WITH CHECK (public.user_has_permission(organization_id, 'notifications.manage'));

DROP POLICY IF EXISTS "perm_newsletter_subscribers_delete" ON newsletter_subscribers;
CREATE POLICY "perm_newsletter_subscribers_delete" ON newsletter_subscribers
    FOR DELETE USING (public.user_has_permission(organization_id, 'notifications.manage'));
-- Donations: anonymous visitors may only create pending pledges (public
-- donate page); authenticated users need donations.create/manage.
DROP POLICY IF EXISTS "Public can create pending donations" ON donations;
CREATE POLICY "Public can create pending donations" ON donations
    FOR INSERT TO anon WITH CHECK (status = 'pending' AND organization_id IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated can create pending donations" ON donations;
CREATE POLICY "Authenticated can create pending donations" ON donations
    FOR INSERT TO authenticated WITH CHECK (
        status = 'pending'
        OR public.user_has_permission(organization_id, 'donations.manage')
    );

-- Notification preferences are self-service.
DROP POLICY IF EXISTS "perm_notification_preferences_self_select" ON notification_preferences;
CREATE POLICY "perm_notification_preferences_self_select" ON notification_preferences
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.user_has_permission(organization_id, 'notifications.manage')
    );

DROP POLICY IF EXISTS "perm_notification_preferences_self_insert" ON notification_preferences;
CREATE POLICY "perm_notification_preferences_self_insert" ON notification_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "perm_notification_preferences_self_update" ON notification_preferences;
CREATE POLICY "perm_notification_preferences_self_update" ON notification_preferences
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "perm_notification_preferences_self_delete" ON notification_preferences;
CREATE POLICY "perm_notification_preferences_self_delete" ON notification_preferences
    FOR DELETE USING (user_id = auth.uid());

-- Audit logs: strictly append-only, readable only with audit.read
-- (owner/admin by default). No insert/update/delete policies for
-- authenticated users — service-role code (which bypasses RLS) writes them.
DROP POLICY IF EXISTS "perm_audit_logs_select" ON audit_logs;
CREATE POLICY "perm_audit_logs_select" ON audit_logs
    FOR SELECT USING (
        public.user_has_permission(organization_id, 'audit.read')
    );

-- The helper functions below support RLS policy evaluation and the
-- SECURITY DEFINER invite/stats flows. They are intentionally static and
-- read-only (they inspect auth.uid() + membership), so executing them is
-- safe for any role. Explicit grants keep them available to policy
-- evaluation for both anon and authenticated callers.
GRANT EXECUTE ON FUNCTION public.role_has_permission(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_org_access(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.storage_org_id(text) TO anon, authenticated;

-- add_tenant_policies is administration-only (it writes policies).
REVOKE ALL ON FUNCTION public.add_tenant_policies(text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_tenant_policies(text, text, text, text, boolean) TO postgres;

-- =====================================================
-- Done. Verify with tests/rls-isolation-tests.sql
-- =====================================================
SELECT public.add_tenant_policies('permission_overrides', 'rbac.read', 'rbac.manage');