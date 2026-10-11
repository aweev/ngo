-- =====================================================
-- NGO OS - Add registration_mode to projects
-- =====================================================
-- Decision: 2026-10-11 - Registration mode configurable per project
-- Sector drives default: health/protection -> individual; cash/voucher -> household

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS registration_mode TEXT NOT NULL DEFAULT 'household'
    CHECK (registration_mode IN ('household', 'individual', 'both'));

COMMENT ON COLUMN projects.registration_mode IS
'Registration granularity for field operations:
  - household: register head of household only (cash/voucher/food sectors)
  - individual: register each person (health/protection sectors)
  - both: allow both modes per project
Defaults to household for backward compatibility. Sector-specific defaults applied in application logic.';