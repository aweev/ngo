-- =====================================================
-- NGO OS - Indexes, Foreign Keys & Tenant Indexes
-- Consolidated from legacy schema-indexes.sql and
-- schema-fks-and-indexes.sql (repairs the corrupted,
-- mid-statement-truncated audit_logs FK from the legacy file)
-- =====================================================

-- =====================================================
-- 1. Core indexes (from schema-indexes.sql)
-- =====================================================

-- Organization indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- Organization members indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON organization_members(user_id, organization_id);

-- Workers indexes
CREATE INDEX IF NOT EXISTS idx_workers_org_id ON workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_workers_email ON workers(email);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_department ON workers(department);

-- Volunteers indexes
CREATE INDEX IF NOT EXISTS idx_volunteers_org_id ON volunteers(organization_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_email ON volunteers(email);
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteers_skills ON volunteers USING GIN(skills);

-- Volunteer hours indexes
CREATE INDEX IF NOT EXISTS idx_vol_hours_org_id ON volunteer_hours(organization_id);
CREATE INDEX IF NOT EXISTS idx_vol_hours_volunteer_id ON volunteer_hours(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_vol_hours_date ON volunteer_hours(date);
CREATE INDEX IF NOT EXISTS idx_vol_hours_status ON volunteer_hours(status);

-- Partners indexes
CREATE INDEX IF NOT EXISTS idx_partners_org_id ON partners(organization_id);
CREATE INDEX IF NOT EXISTS idx_partners_type ON partners(type);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);

-- Donors indexes
CREATE INDEX IF NOT EXISTS idx_donors_org_id ON donors(organization_id);
CREATE INDEX IF NOT EXISTS idx_donors_email ON donors(email);
CREATE INDEX IF NOT EXISTS idx_donors_type ON donors(type);
CREATE INDEX IF NOT EXISTS idx_donors_status ON donors(status);

-- Donations indexes
CREATE INDEX IF NOT EXISTS idx_donations_org_id ON donations(organization_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_campaign_id ON donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_donations_project_id ON donations(project_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_donated_at ON donations(donated_at);
CREATE INDEX IF NOT EXISTS idx_donations_org_created ON donations(organization_id, created_at DESC);

-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_project_id ON campaigns(project_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Invitations indexes
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_org_created ON invitations(organization_id, created_at DESC);

-- Public forms & newsletter indexes
CREATE INDEX IF NOT EXISTS idx_form_submissions_slug ON form_submissions(form_slug, status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_org ON form_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_org_created ON form_submissions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_org_created ON newsletter_subscribers(organization_id, created_at DESC);

-- =====================================================
-- 2. Missing foreign keys (from schema-fks-and-indexes.sql)
-- =====================================================

-- Donations → campaigns / projects (were plain UUID columns)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_donations_campaign') THEN
        ALTER TABLE donations
            ADD CONSTRAINT fk_donations_campaign FOREIGN KEY (campaign_id)
            REFERENCES campaigns(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_donations_project') THEN
        ALTER TABLE donations
            ADD CONSTRAINT fk_donations_project FOREIGN KEY (project_id)
            REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Volunteer hours → projects
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_volunteer_hours_project') THEN
        ALTER TABLE volunteer_hours
            ADD CONSTRAINT fk_volunteer_hours_project FOREIGN KEY (project_id)
            REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
END $$;

-- User references (NOT VALID so pre-existing rows are not re-checked;
-- new writes are enforced from now on).
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_org_members_user') THEN
        ALTER TABLE organization_members
            ADD CONSTRAINT fk_org_members_user FOREIGN KEY (user_id)
            REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_workers_user') THEN
        ALTER TABLE workers
            ADD CONSTRAINT fk_workers_user FOREIGN KEY (user_id)
            REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_volunteers_user') THEN
        ALTER TABLE volunteers
            ADD CONSTRAINT fk_volunteers_user FOREIGN KEY (user_id)
            REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_conversation_messages_sender') THEN
        ALTER TABLE conversation_messages
            ADD CONSTRAINT fk_conversation_messages_sender FOREIGN KEY (sender_id)
            REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
    END IF;
END $$;

-- REPAIRED: legacy file was corrupted mid-statement (the REFERENCES
-- clause was displaced to the end of the file). Restored intact here.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_audit_logs_user') THEN
        ALTER TABLE audit_logs
            ADD CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id)
            REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
    END IF;
END $$;

-- =====================================================
-- 3. Tenant indexes for extended tables (from schema-fks-and-indexes.sql)
-- =====================================================

-- Notifications & integrations
CREATE INDEX IF NOT EXISTS idx_notification_templates_org ON notification_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_created ON notifications(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_org ON notification_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_org_created ON webhook_deliveries(organization_id, created_at DESC);

-- RBAC, scheduling & reporting
CREATE INDEX IF NOT EXISTS idx_custom_roles_org ON custom_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_role_assignments_org ON role_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_permission_overrides_org ON permission_overrides(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_org ON scheduled_jobs(organization_id, next_run_at);
CREATE INDEX IF NOT EXISTS idx_job_executions_org_created ON job_executions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_definitions_org ON report_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_org_created ON report_snapshots(organization_id, generated_at DESC);

-- Content, events & media
CREATE INDEX IF NOT EXISTS idx_content_pages_org ON content_pages(organization_id, slug);
CREATE INDEX IF NOT EXISTS idx_content_blocks_org ON content_blocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_media_library_org ON media_library(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_events_org ON org_events(organization_id, start_date);
CREATE INDEX IF NOT EXISTS idx_event_registrations_org ON event_registrations(organization_id, event_id);

-- Tags & messaging
CREATE INDEX IF NOT EXISTS idx_tags_org ON tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_tag_assignments_org ON tag_assignments(organization_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON conversations(organization_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_org ON conversation_messages(organization_id, conversation_id, created_at);

-- Impact & finance
CREATE INDEX IF NOT EXISTS idx_impact_metrics_org ON impact_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_impact_measurements_org ON impact_measurements(organization_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_impact_goals_org ON impact_goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_budgets_org ON budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_budget_lines_org ON budget_lines(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org_created ON expenses(organization_id, created_at DESC);

-- Governance, HR, automations & workflows
CREATE INDEX IF NOT EXISTS idx_feature_flags_org ON feature_flags(organization_id);
CREATE INDEX IF NOT EXISTS idx_governance_approvals_org ON governance_approvals(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_org ON performance_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_hr_lifecycle_org ON hr_lifecycle_records(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_automation_rules_org ON automation_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_org ON automation_executions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_templates_org ON automation_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_org ON workflow_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_org ON workflow_instances(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_org ON workflow_steps(organization_id);
