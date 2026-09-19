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

## Observability TODO (before prod)
- Sentry (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`) — CSP already allows
  `https://*.sentry.io`; `connect-src` allows Vercel vitals.
- Uptime check on `/` + `/api/stripe/webhook` (expect 400 without signature).
- Prometheus scrape of Go API `/metrics` + Grafana dashboard.
- On-call rotation + alert thresholds recorded here.
