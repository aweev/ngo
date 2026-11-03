-- =====================================================
-- ADR-0001 / Slice A — make the seeded "Large gift alert" automation actionable.
--
-- The original seed queued an in_app notification with no recipient, so a large
-- gift produced a row nobody would ever see. Target the executive director
-- (base role "owner") and let the engine interpolate the event payload into the
-- alert copy. automation-engine resolves recipient_role to organization_members
-- .user_id and substitutes {{path}} tokens from the triggering event payload.
-- =====================================================

UPDATE automation_templates
SET template_config = $json$
{
    "trigger_config": { "event": "donation.completed" },
    "conditions": [ { "field": "amount", "operator": "gt", "value": 1000, "logic": "and" } ],
    "actions": [
        {
            "type": "send_notification",
            "config": {
                "channel": "in_app",
                "recipient_role": "owner",
                "subject": "Large gift received",
                "body": "A donation of {{amount}} {{currency}} was received from {{donor_name}}. Consider a personal follow-up."
            }
        }
    ]
}
$json$::jsonb,
    updated_at = NOW()
WHERE is_system = TRUE AND name = 'Large gift alert';
