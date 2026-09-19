-- =====================================================
-- NGO OS - Stripe webhook idempotency + payment intent link
--
-- 1) stripe_events: Stripe event-id dedup. The webhook inserts the
--    provider event id first; a unique violation means "already
--    processed" and the handler can ack without touching donations.
--    Retried `checkout.session.completed` deliveries are then harmless.
--
-- 2) donations.payment_intent: Checkout Session id (payment_ref) and
--    PaymentIntent id are different objects. `charge.refunded` only
--    carries the PaymentIntent, so the webhook stores it on completion
--    and looks refunds up by this column.
-- =====================================================

CREATE TABLE IF NOT EXISTS stripe_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Internal webhook-dedup table: no tenant data, no policies. Enabling RLS
-- with zero policies denies anon/authenticated entirely (fail-closed) while
-- the service role used by the webhook bypasses RLS.
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE donations
    ADD COLUMN IF NOT EXISTS payment_intent TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_payment_intent
    ON donations(payment_intent)
    WHERE payment_intent IS NOT NULL;

