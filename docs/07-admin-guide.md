# 07 — Admin Guide

Reader: owners, admins, managers, M&E, finance. The command center is at
`/admin` (27 legacy sections frozen to the working core — see
`12-roadmap.md`). Every destructive action confirms; every money/approval
action is audit-trailed.

## Programs (`/admin/projects`)

Projects carry `kind` (program/campaign/event), `category` (drives the IATI
sector map: health, education, wash/water, protection, livelihoods, food,
shelter, emergency), status, budget, and beneficiary targets. Campaigns and
events are currently separate tables with identical shapes — a planned merge
into `projects.kind`, so prefer creating **programs** for new work.

## Field oversight

- **Verification queue**: review quarantined field reports, assign metrics,
  verify, promote. Only promoted measurements feed indicators.
- **Duplicates**: merge from the beneficiary detail or sync-conflict views;
  services and referrals follow the kept record automatically.
- **Conflicts**: resolve keep-mine / keep-server / merged (names/phones are
  never patched from conflict payloads).

## Finance (`/admin/financial`, `/admin/financial/expenses`, `/admin/financial/reconcile`)

- **Expenses page**: pending and first-approval rows show Approve/Reject with
  inline error display — grant-term blocks name the exact rule violated.
- **Budgets pages**: create budgets and lines; line spend rolls up
  automatically from approved/paid expenses.
- **Reconcile** (the monthly close): budget lines vs actuals, grants vs
  spend, awaiting approvals, unfunded spend, missing receipts, missing FX
  rates, plus finance settings (reporting currency, second-approver
  threshold) and the dated rate table. Close only when every attention list
  is zero or documented.
- **Trust center** (`/admin/trust`): funds, grants (terms, allowable costs,
  reporting obligations), grant↔donor links, audit-event ledger + CSV.

## Donors & fundraising (`/admin/donors`, `/admin/reporting`)

- Donor list → **Donor 360°** (`/admin/donors/[id]`): per-currency totals,
  commitments, linked institutional grants, deadline tracking from grant
  terms (overdue badges). Link/unlink grants with the picker (same-org
  checked, audit-logged).
- Reporting: build a definition (allowlisted sources now include
  beneficiaries, households, services, referrals, grants, funds; eq-filters;
  sorting) → **Run** (snapshot + query hash) → **Export CSV** (identical
  fetch path) → attach the hash to the donor narrative as provenance.
- **IATI export** button: downloads XML mapped from real rows; read the
  warnings — they list exactly what was omitted (unmapped category, unlinked
  funder) and why. Map the category or link the grant, then re-export.

## Impact (`/admin/impact`)

Metrics (baseline/current/target, public flag for the homepage), measurements
(dated, sourced), goals with project links, and the field-report pipeline
above. Disaggregated collection (sex/age/disability/location) is built into
registration; indicator disaggregation views are roadmap (Phase 3).

## People (`/admin/members`, `/workers`, `/volunteers`, `/partners`, `/hr`)

Invites and roles (five fixed roles — no custom builder), staff directory,
volunteer register with hours approval, partner directory (implementing vs
strategic). HR-lite only: no reviews or lifecycle workflows by design.

## Content (`/admin/content`, `/admin/notifications`)

Frozen minimal surface: homepage hero/mission/get-involved slugs
(`homepage-hero`, `homepage-mission`, `homepage-get-involved`), testimonial /
story / news / team / milestone categories, notification templates for
transactional messages (approvals, deadlines). AI translation and template
builders are parked; manual translation remains.

## Scheduler, forms, settings

- `scheduled_jobs` is the single durable scheduler (report/notification/
  automation/export/sync/custom) drained by `cron-runner`.
- Form definitions collect structured submissions; the offline field app does
  not depend on them.
- Settings covers branding, organization profile, and finance settings.
  Feature flags exist for the Phase 0 nav freeze (`NEXT_PUBLIC_PHASE0_FULL_NAV`
  operator escape hatch).
