-- =====================================================
-- NGO OS - Donation identity + subscription lifecycle columns
--
-- P0-3/P0-4: checkout must persist donor identity (email, legal name,
-- receipt flag, donor link) and the full Stripe lifecycle (invoices,
-- subscription state, disputes). Previously donor PII was packed into
-- free-text `notes` and recurring invoices had nowhere to land.
-- =====================================================

ALTER TABLE donations
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS needs_receipt BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS dispute_status TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- One provider invoice maps to exactly one donation row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_stripe_invoice
    ON donations(stripe_invoice_id)
    WHERE stripe_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donations_org_status_created
    ON donations(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_donations_subscription
    ON donations(subscription_ref)
    WHERE subscription_ref IS NOT NULL;

-- Donor identity: one row per (org, lowercase email).
CREATE UNIQUE INDEX IF NOT EXISTS uq_donors_org_email
    ON donors(organization_id, lower(email))
    WHERE email IS NOT NULL;

-- Donations reach RLS via the standard tenant policy set (migration 14);
-- no new grants are needed for anon/authenticated.
