-- =====================================================
-- NGO OS - System automation templates
-- The automation_templates table shipped with zero code and zero rows.
-- These organization-less (is_system) starters are readable by every
-- organization (see add_tenant_policies ... TRUE) and instantiate
-- into disabled rules for review via instantiateAutomationTemplate().
-- Guarded by name: safe to re-run, never duplicates.
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM automation_templates WHERE is_system AND name = 'New donation thank-you') THEN
        INSERT INTO automation_templates (id, organization_id, name, description, category, trigger_type, template_config, is_system)
        VALUES (gen_random_uuid(), NULL, 'New donation thank-you', 'Queue a thank-you notification for every completed donation.', 'donations', 'event',
            '{"trigger_config": {"event": "donation.completed"}, "conditions": [], "actions": [{"type": "send_notification", "config": {"channel": "email"}}]}'::jsonb,
            TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM automation_templates WHERE is_system AND name = 'Large gift alert') THEN
        INSERT INTO automation_templates (id, organization_id, name, description, category, trigger_type, template_config, is_system)
        VALUES (gen_random_uuid(), NULL, 'Large gift alert', 'Notify the team when a single donation exceeds 1,000.', 'donations', 'event',
            '{"trigger_config": {"event": "donation.completed"}, "conditions": [{"field": "amount", "operator": "gt", "value": 1000, "logic": "and"}], "actions": [{"type": "send_notification", "config": {"channel": "in_app"}}]}'::jsonb,
            TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM automation_templates WHERE is_system AND name = 'Weekly impact digest') THEN
        INSERT INTO automation_templates (id, organization_id, name, description, category, trigger_type, template_config, is_system)
        VALUES (gen_random_uuid(), NULL, 'Weekly impact digest', 'Send a weekly summary to the team (pair with a Monday cron job).', 'reporting', 'schedule',
            '{"trigger_config": {"cron": "0 8 * * 1"}, "conditions": [], "actions": [{"type": "send_notification", "config": {"channel": "email"}}]}'::jsonb,
            TRUE);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM automation_templates WHERE is_system AND name = 'Volunteer welcome') THEN
        INSERT INTO automation_templates (id, organization_id, name, description, category, trigger_type, template_config, is_system)
        VALUES (gen_random_uuid(), NULL, 'Volunteer welcome', 'Welcome every newly registered volunteer.', 'volunteers', 'event',
            '{"trigger_config": {"event": "volunteer.created"}, "conditions": [], "actions": [{"type": "send_notification", "config": {"channel": "email"}}]}'::jsonb,
            TRUE);
    END IF;
END
$$;
