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

---

## GDPR Compliance Prerequisites (Must Complete Before Phase 3)

### 1. Data Protection Officer (DPO) — Required by GDPR Art. 37
**Status:** NOT APPOINTED — **Blocker for Phase 3**

| Requirement | Detail | Owner | Due |
|-------------|--------|-------|-----|
| DPO appointed | Internal staff or external contractor with GDPR expertise | Leadership | Before Phase 3 kickoff |
| DPO contact published | In privacy policy, Supabase project settings, breach procedure | DPO | Before Phase 3 kickoff |
| DPO independence | No conflict of interest (not CTO, not lead dev) | Leadership | Before Phase 3 kickoff |
| DPO resources | Budget for training, tools, legal counsel | Leadership | Before Phase 3 kickoff |

### 2. Supabase Region & Data Residency — Required by GDPR Art. 28 (DPA)
**Status:** NOT DOCUMENTED — **Blocker for Phase 3**

| Item | Required Value | Current | Action |
|------|----------------|---------|--------|
| Supabase project region | `eu-west-1` (Ireland) or `eu-central-1` (Frankfurt) for EU data subjects | [TBD] | Document in Supabase dashboard + this file |
| Data Processing Addendum (DPA) | Signed with Supabase | [TBD] | Execute via Supabase dashboard |
| Sub-processor list | Reviewed and accepted | [TBD] | DPO to review quarterly |
| Transfer mechanism | Standard Contractual Clauses (SCCs) for any non-EU sub-processors | [TBD] | DPO to verify |

**Current Supabase Project:** `web` (see `supabase/config.toml`)
**Region Verification:** Run `supabase projects list` → confirm region column

### 3. Breach Notification Procedure — Required by GDPR Art. 33/34
**Status:** NOT DOCUMENTED — **Blocker for Phase 3**

#### 3.1 Breach Drill Requirements
| Drill | Frequency | Participants | Success Criteria |
|-------|-----------|--------------|------------------|
| Tabletop exercise | Quarterly | DPO, CTO, On-call, Field Ops Lead, Legal | Decision log completed in <2h |
| Technical simulation | Bi-annual | Engineering, DPO | Breach detected → contained → reported in <72h |
| Full notification test | Annual | DPO, Legal, Comms, Supervisory Authority contact | Draft notification to SA + data subjects ready in <48h |

#### 3.2 Breach Notification Procedure (72-Hour Clock)

```
T+0h    Breach detected (automated alert OR manual report)
        ↓
T+0.5h  On-call acknowledges → pages DPO + CTO
        ↓
T+1h    Containment: revoke sessions, freeze affected tables, preserve logs
        ↓
T+2h    DPO assesses: personal data involved? Likely risk to rights/freedoms?
        ↓
T+4h    If YES → Draft SA notification (Art. 33)
        If HIGH RISK → Draft data subject notification (Art. 34)
        ↓
T+24h   Internal review: legal counsel validates notifications
        ↓
T+48h   Notifications sent (SA + data subjects if required)
        ↓
T+72h   DEADLINE: All notifications submitted
        ↓
T+7d    Post-incident review → action items → roadmap decision log
```

#### 3.3 Breach Notification Templates

**Supervisory Authority (Art. 33):**
- Nature of breach (categories, approx. number of data subjects/records)
- DPO contact details
- Likely consequences
- Measures taken/proposed to address/mitigate

**Data Subjects (Art. 34, if high risk):**
- Plain language description
- DPO contact details
- Likely consequences
- Measures taken to mitigate
- Steps data subject can take (e.g., monitor accounts)

### 4. Records of Processing Activities (ROPA) — Required by GDPR Art. 30
**Status:** PARTIAL (audit_events covers some) — **Complete Before Phase 3**

| Processing Activity | Purpose | Legal Basis | Data Categories | Recipients | Retention | Third Country Transfer |
|---------------------|---------|-------------|-----------------|------------|-----------|------------------------|
| Beneficiary registration | Humanitarian aid delivery | Legitimate interest / Consent | Name (encrypted), sex, age_band, disability, location, phone (encrypted) | Field staff, partner orgs (anonymized) | 7y after last contact | No (EU region) |
| Service delivery tracking | Program monitoring | Legitimate interest | Service type, quantity, date, beneficiary link | Donors (aggregated), auditors | 7y | No |
| Donor management | Fundraising compliance | Contract / Legitimate interest | Name, email, amount, payment ref | Payment processor (Stripe), tax authority | 10y (financial regs) | Stripe (US) — SCCs |
| Staff/volunteer management | HR operations | Contract / Legal obligation | Name, email, role, hours | Payroll (if applicable) | 7y post-employment | No |
| Field sync (offline queue) | Offline-first operations | Legitimate interest | Encrypted PII queue, device ID | Device only (local) | Until synced + 30d | No |

---

## Compliance Checklist (Gate for Phase 3)

- [ ] DPO appointed and contact published
- [ ] Supabase region confirmed as EU (Ireland/Frankfurt)
- [ ] DPA with Supabase executed and stored
- [ ] Breach procedure documented, tested, drill dated
- [ ] ROPA complete for all processing activities
- [ ] Privacy policy updated with DPO contact, lawful bases, retention
- [ ] Consent records schema supports withdrawal evidence (`consent_records` table)
- [ ] DSAR workflow implemented (Phase 3: retention executor + erasure path)
- [ ] Encryption key rotation procedure documented (Phase 3: envelope encryption)

---

## Cost & sustainability posture

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
