# Incident runbook (web)

## Triage (first 15 min)
1. Identify scope: homepage down? auth? donations? Check hosting status +
   Supabase status + Stripe status.
2. Logs: hosting logs for `[stripe/webhook]` errors; Supabase logs for RLS
   denials; browser console for CSP violations (`report-uri` TODO).
3. Common causes:
   - `ENV.NEXT_PUBLIC_*` missing at build → wrong canonical/CSP connect-src.
   - Supabase keys rotated but `.env.local` stale → auth + RLS failures.
   - Stripe webhook 500s → Stripe retries; check `stripe_events` for gaps.

## Donation incident
1. Do NOT mark donations manually unless Stripe Dashboard confirms payment.
2. `unmatched:true` responses = insert failed or PI link missing — reconcile
   `donations.payment_ref / payment_intent` against Stripe Session/PaymentIntent.
3. `duplicate:true` is normal on retries — not an incident.

## Metrics & alert thresholds (Wave 3)
Scrape target: `GET /api/metrics` with `Authorization: Bearer $METRICS_TOKEN`
(server-side env var only; the endpoint answers **404 when the token is
unset** and **401 on a wrong token**, so it is safe to keep the route always
mounted). Feed the Prometheus text output into your collector and alert on:

| Metric | Page when | Why |
|---|---|---|
| `ngo_outbox_dead` | any value ≥ 1 | a side effect stopped retrying — drain manually after fixing the consumer |
| `ngo_outbox_pending` | > 100 for 10 min | drain stalled or cron-runner not running |
| `ngo_jobs_dead_letter` | any value ≥ 1 | scheduled work for a tenant stopped entirely |
| `ngo_jobs_last_run_failed` | ≥ 3 for 15 min | systemic failure (cron secret, network, schema) |
| `ngo_notifications_failed` | spike ≥ 5 in 15 min | provider broken or credentials stale |
| `ngo_notifications_pending` | > 1000 for 15 min | dispatcher not claiming |
| `ngo_webhook_deliveries_unconfirmed` | grows every scrape for 30 min | outbound integrations degraded |

Correlate with the structured JSON logs emitted by
`supabase/functions/_shared/reliability.ts` (`{"level":…,"event":…}`): grep
`level:"error"` first, then the `event` name shown in the alert annotation.

## Remaining observability (before prod)
- Sentry (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`) — CSP already allows
  `https://*.sentry.io`; `connect-src` allows Vercel vitals.
- Uptime check on `/` + `/api/stripe/webhook` (expect 400 without signature).
- On-call rotation: name the humans paged for the thresholds above.
