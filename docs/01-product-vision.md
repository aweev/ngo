# 01 — Product Vision

## North star

NGO OS is the single system that lets an organization turn donor money into
proven community impact, with full transparency. A field officer in a remote
village, a program manager, a finance officer, a fundraiser, a volunteer
coordinator, and an executive director each get exactly what they need in
seconds, with no training manual.

## The seven core jobs

1. **Manage programs and projects** — plans, activities, budgets, timelines, results.
2. **Register and support beneficiaries** — case records, services delivered, referrals, follow-up.
3. **Collect field data reliably, including offline** — and turn it into evidence.
4. **Manage donors, grants, and fundraising** — pipeline, commitments, restrictions, reporting deadlines.
5. **Run finance with fund accountability** — budgets vs actuals, restricted funds, expenses, audit readiness.
6. **Report impact** — donor reports, M&E indicators, dashboards, stories, public transparency.
7. **Coordinate people** — staff, volunteers, partners, and approvals.

Everything in the project must serve these jobs. Anything that does not is a
candidate for removal (see `12-roadmap.md` for the cut list status).

## Personas and their home screens

| Persona | Home | Max destinations |
|---|---|---|
| Field officer (shared low-end Android, intermittent signal) | `/field` | Record visit · Beneficiaries · Log service · Sync · Help |
| Program manager | `/admin` + verification queue | Programs · Field reports · Indicators · Team · Reports |
| Finance officer | `/admin/financial` | Approvals · Expenses · Budgets vs actuals · Grants · Audit trail |
| Fundraiser | `/admin/donors`, `/admin/reporting` | Pipeline · Donor 360° · Report builder · Deadlines · Evidence |
| M&E officer | `/admin/impact` | Indicators · Data quality · Field queue · Forms · Exports |
| Executive director / board | `/admin` overview | Money in → services → outcomes, in 2 minutes |
| Volunteer (day one) | `/dashboard` | Tasks · Hours · Messages · Settings |

Role mapping to system roles (`src/lib/auth/permissions.ts`): field officers
are `member`s with `beneficiaries.read/manage`; program staff are `manager`s;
finance/admin functions require `owner`/`admin` (plus `finance.approve` for
decisions on money). Only five roles exist — there is no custom role builder
by design.

## Design constraints (non-negotiable)

- **Offline-first field work.** Registration, service logging, and referrals
  work for days without internet and sync safely afterward: no duplicates
  (idempotency keys), no lost records (IndexedDB outbox, ack-only removal),
  and visible conflict handling (see `02-architecture.md`).
- **Do no harm.** Beneficiary names and phones are AES-256-GCM ciphertext in
  Postgres; lookup runs on blind-index hashes. Every record requires a granted
  consent row. Archival is soft; hard deletion is a governed DSAR flow.
- **Donor and fund accountability.** Restricted vs unrestricted funds,
  allowable-cost terms, two-step approvals above threshold, dated FX rates,
  cost splits that sum exactly, and donor-ready exports with query hashes.
- **Immutable audit trails.** `audit_events` is append-only at the database
  level; money, approvals, promotions, exports, and merges all write events.
- **Low digital literacy.** Large tap targets, icons plus labels, plain
  language, undo windows, confirmations on destructive actions, honest
  empty/offline/error states in five languages (en, de, fr, es, ar).
- **Interoperability.** CSV export on every report, IATI XML for
  institutional donors, spreadsheet import path — no vendor lock-in for the
  NGO's own data.
- **Sustainability.** Runnable by two developers: one Next.js app, one
  Postgres, four edge functions, static verification gates in CI.

## Non-goals (explicit)

- Not an HRIS (no performance reviews, no lifecycle workflows beyond invites).
- Not an internal chat system (field coordination happens over
  WhatsApp/SMS; the system sends notifications, not messages).
- Not a generic CMS or marketing site builder (public pages are a frozen,
  minimal transparency surface).
- Not a full accounting ledger (no journal entries, no payroll; integrates
  outward via CSV).
- No AI-generated donor narratives (a hallucinated beneficiary count is a
  compliance incident, not a feature).

## Success metrics

- Time-to-first-record for a new field officer: under 15 minutes; under 2
  minutes per household after training.
- Offline sync success ≥ 99.5%, zero lost records, zero silent duplicates.
- Donor-report preparation hours down ≥ 70% vs spreadsheets; zero audit
  findings on restricted spend.
- New NGO live in under a week from spreadsheets; retention after pilot
  funding ends above 60%.
