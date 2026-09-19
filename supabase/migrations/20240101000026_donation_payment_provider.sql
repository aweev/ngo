-- =====================================================
-- NGO OS - Online payment provider columns for donations
--
-- `createDonationCheckout` / the Stripe webhook
-- (`src/app/api/stripe/webhook/route.ts`) reference provider bookkeeping
-- that did not exist yet:
--
--   * payment_provider : 'stripe' | 'manual' | 'bank_transfer' ...
--   * payment_ref      : the provider-side object id (Checkout Session
--                        id, later the PaymentIntent id for refunds)
--   * subscription_ref : recurring mandate / subscription id
--
-- The webhook looks donations up by payment_ref, so it is indexed.
-- =====================================================

ALTER TABLE donations
    ADD COLUMN IF NOT EXISTS payment_provider TEXT,
    ADD COLUMN IF NOT EXISTS payment_ref TEXT,
    ADD COLUMN IF NOT EXISTS subscription_ref TEXT;

-- Unique where present: one provider object maps to exactly one donation.
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_payment_ref
    ON donations(payment_ref)
    WHERE payment_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donations_provider_status
    ON donations(organization_id, payment_provider, status, created_at DESC);

-- Donations reach RLS via the standard tenant policy set (migration 14);
-- no new grants are needed for anon/authenticated.

-- Donor legal name captured at checkout. Required to issue a valid
-- Zuwendungsbestätigung / tax receipt (the amount + email alone are not
-- enough), and used by the webhook to create the matching `donors` row.
ALTER TABLE donations
    ADD COLUMN IF NOT EXISTS donor_name TEXT;
