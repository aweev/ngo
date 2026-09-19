# Rollback runbook (web)

Web is stateless (all state in Supabase/Stripe). Rollback = previous image.

1. Keep last 3 images tagged: `awe-web:$PREV_TAG` always available.
2. Rollback: redeploy `$PREV_TAG` with the same env file. No migration rollback
   needed for additive migrations (27 = new table + nullable column).
3. If a migration must be reverted, revert **code first**, then apply a new
   forward migration (never `db reset` in prod).
4. Verify: homepage 200, webhook 400-without-signature, login flow.

## Stripe safety
- Webhook dedup (`stripe_events`) makes redelivery safe: replaying events
  after rollback acks duplicates without double-crediting donations.
- `donations` status transitions are guarded by `neq(status)` — no flapping.
