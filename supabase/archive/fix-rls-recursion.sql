-- =====================================================
-- NGO OS - Fix RLS Infinite Recursion Issue
-- This script drops broken policies and recreates them with the fix
-- =====================================================

-- Step 1: Drop the helper function (if it exists)
DROP FUNCTION IF EXISTS public.user_has_org_access(uuid) CASCADE;

-- Step 2: Drop all broken RLS policies that cause infinite recursion
-- These policies use recursive subqueries on organization_members

-- Organization policies
DROP POLICY IF EXISTS "Users can view organization members" ON organization_members;

-- Worker policies
DROP POLICY IF EXISTS "Users can view workers" ON workers;

-- Volunteer policies
DROP POLICY IF EXISTS "Users can view volunteers" ON volunteers;

-- Partner policies
DROP POLICY IF EXISTS "Users can view partners" ON partners;

-- Donor policies
DROP POLICY IF EXISTS "Users can view donors" ON donors;

-- Donation policies
DROP POLICY IF EXISTS "Users can view donations" ON donations;

-- Project policies
DROP POLICY IF EXISTS "Users can view projects" ON projects;

-- Campaign policies
DROP POLICY IF EXISTS "Users can view campaigns" ON campaigns;

-- Audit log policies
DROP POLICY IF EXISTS "Users can view audit logs" ON audit_logs;

-- Step 3: Drop tenant isolation policies from extended tables
-- These all use recursive subqueries
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
    END LOOP;
END $$;

-- =====================================================
-- Step 4: Create the helper function (SECURITY DEFINER prevents recursion)
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_org_access(org_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = org_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Step 5: Recreate all policies with the fix
-- =====================================================

-- Organization Members - Fixed
CREATE POLICY "Users can view organization members" ON organization_members
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

-- Workers - Fixed
CREATE POLICY "Users can view workers" ON workers
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

-- Volunteers - Fixed
CREATE POLICY "Users can view volunteers" ON volunteers
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

-- Partners - Fixed
CREATE POLICY "Users can view partners" ON partners
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

-- Donors - Fixed
CREATE POLICY "Users can view donors" ON donors
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

-- Donations - Fixed
CREATE POLICY "Users can view donations" ON donations
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

-- Projects - Fixed
CREATE POLICY "Users can view projects" ON projects
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

-- Campaigns - Fixed
CREATE POLICY "Users can view campaigns" ON campaigns
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

-- Audit Logs - Fixed
CREATE POLICY "Users can view audit logs" ON audit_logs
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

-- =====================================================
-- Step 6: Recreate tenant isolation SELECT policies for extended tables
-- =====================================================

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
        EXECUTE format('
            CREATE POLICY "tenant_isolation_select" ON %I FOR SELECT USING (
                public.user_has_org_access(organization_id)
            );
        ', tbl);
    END LOOP;
END $$;

-- =====================================================
-- Done! All RLS policies have been fixed.
-- =====================================================
-- Summary of changes:
-- 1. Created user_has_org_access() helper function with SECURITY DEFINER
-- 2. Replaced all recursive subqueries with the helper function
-- 3. This prevents infinite recursion while maintaining security
-- =====================================================
