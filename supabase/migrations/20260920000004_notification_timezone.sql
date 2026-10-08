-- =====================================================
-- NGO OS - Per-user timezone for notification quiet hours
-- Quiet windows were interpreted as UTC for everyone. This nullable
-- IANA timezone lets each member's window follow their local clock;
-- NULL keeps the previous UTC behavior. Row-level RLS is unchanged
-- (self-select/insert/update by user_id).
-- =====================================================

ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS timezone TEXT NULL
        CHECK (timezone IS NULL OR timezone <> '');
