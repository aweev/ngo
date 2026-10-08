# 09 — Operations

Reader: on-call engineers, IT, leadership. Detailed procedures also live in
`runbooks/` (`backup.md`, `deploy.md`, `incidents.md`, `rollback.md`) — this
guide is the narrative that binds them.

## Backups & disaster recovery

- **Database**: Supabase point-in-time recovery (PITR) on the project; verify
  the retention window in the dashboard quarterly. Before any migration push
  on production data, confirm the latest successful backup timestamp.
- **What restores what**: PITR covers Postgres (all domains). Storage buckets
  (trust-documents, content-media, logos) need bucket-level versioning/
  replication review — confirm with the Supabase plan in use; evidence files
  are irreplaceable, database rows are not.
- **Restore drill** (quarterly, game-day): restore to a *new* project, run
  `verify-rls-isolation` + spot-check decrypt of one seeded PII row with the
  production `ENCRYPTION_KEY`, run the reconcile screen, then destroy the
  clone. Record the drill date and duration; alert if restore exceeds the
  agreed RTO.
- **Field devices are not backups.** The IndexedDB outbox is a queue, not an
  archive — synced-and-acknowledged records live server-side; anything still
  queued lives only on that phone.

## Monitoring & alerting

- `/api/health` (uptime) and `/api/metrics` (Prometheus/text: outbox pending/
  dead, reliability + UX metrics; gated by `METRICS_TOKEN`, 404 when unset).
  Scrape both; thresholds live in `runbooks/incidents.md`.
- Abuse/risk alerts: PII-free webhooks via `ABUSE_ALERT_WEBHOOK_URL` at
  `ABUSE_ALERT_MIN_SCORE` (default 50).
- Edge-function health: `cron-runner` 401-without-secret / 200-with-secret
  probes (see `supabase/README.md` release section).
- Log signals that matter: `[audit-events] Failed to record`, `[field-records]
  * insert` failures, `[approveExpense]` errors, `CAPTCHA verification is
  unavailable` (fail-closed — public intake degrades, watch it).

## Incident response

1. **Triage by blast radius**: PII/safeguarding > money correctness >
   availability > cosmetics. The first two page the DPO/finance lead, not
   just engineering.
2. **Contain**: revoke affected sessions/users via Supabase Auth admin;
   suspend abusive senders/keys; freeze expense approvals by temporarily
   removing `finance.approve` via permission overrides if fraud is
   suspected (every override is itself audited).
3. **Preserve evidence**: export `audit_events` + `audit_logs` slices before
   any cleanup; never delete rows during an investigation (legal holds exist
   for this: `legal_holds`).
4. **Recover**: `runbooks/rollback.md` for deploys (previous build +
   migration-forward fix — never edit applied migrations); PITR for data.
5. **Review**: within 5 working days, blameless, with one action item per
   contributing cause tracked in `12-roadmap.md` decision log format.

Breach readiness gap (open): a named DPO and a 72-hour notification procedure
are still required — see `04-security-and-privacy.md` and `12-roadmap.md` Q7.

## Support model (small-NGO reality)

- **Field breakage** (sync stuck, lost phone): the sync screen states the
  reason per record — train one "sync champion" per site to read it. Remote
  wipe is roadmap; today the response is account freeze + device treated as
  compromised (see `04-security-and-privacy.md`).
- **Finance breakage** (blocked approval, missing rate): the UI names the
  rule; the reconcile screen lists every attention item. No silent states
  exist by design — if a number looks wrong, `query_hash` + audit trail
  identify exactly which fetch produced it.
- **Release support**: pin the deployed commit + migration list in the
  release note; keep one known-good build tagged for instant rollback.

## Cost & sustainability posture

One Next.js app, one Postgres, four edge functions, no per-seat services
besides Supabase + (optional) Stripe/Resend/Twilio. Biggest cost levers are
database size (snapshots store full rows — cap `MAX_REPORT_ROWS` deliberately)
and edge-function invocations (minute-cadence runners). Phase 4 cuts
(-2 functions, -15 tables) exist partly to lower this bill.
