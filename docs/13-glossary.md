# 13 — Glossary

## Fund types (`funds.fund_type`)

- **unrestricted** — spend anywhere within mission.
- **temporarily_restricted** — spend only on the stated purpose/time (reports
  as "restricted" in balances).
- **permanently_restricted** — endowment-style (reports as "endowment").

## Expense statuses

- **pending** — submitted, awaiting first decision.
- **approved_first** — passed step 1 above the org threshold; needs a
  *different* approver to finalize.
- **approved** — final; stamped with `approved_by/at`.
- **rejected** — terminal, with reason in `expense_approvals`.
- **paid** — money moved; counts toward spend like approved.

## Field-report validation states

- **quarantined** — raw intake, trusted by nobody, never touches a metric.
- **pending_review** — triaged, metric assigned, awaiting reviewer.
- **verified** — reviewer-confirmed, promotable.
- **rejected** — refused with a reason (stays as evidence of the decision).
- **promoted** — measurement minted via `promote_field_report()` (idempotent).

## Sync states (per queued op)

- **synced** — created server-side, or replay of an existing idempotency key.
- **duplicate** — created AND flagged; a human merges later.
- **conflict** — server moved since `base_updated_at`; both versions kept.
- **error** — rejected with a human reason; kept queued, parks after 8 tries.

## Referral lifecycle

`open` → `accepted` → `completed`, with `closed` (withdrawn) and `expired`
as terminal branches. Follow-up dates drive the open queue.

## Grant lifecycle

`draft` → `submitted` → `awarded` → `active` → `completed` → `closed`, with
`rejected` as the terminal branch. Only `active` (and `awarded`) grants
should back spend; reporting obligations in `reporting_requirements` drive
donor deadlines.

## Roles (the only five)

**owner** > **admin** > **manager** > **member**; field officers are members
with `beneficiaries.*`. No custom roles by design (see `01-product-vision`).

## Key artifacts

- **query_hash** — SHA-256 over report entity + filters + sort + day;
  proves what a snapshot/CSV contains.
- **idempotency_key / offline_uuid** — client-minted stable ids making every
  retry and replay safe.
- **search_hash** — blind SHA-256 index enabling lookup/dedupe without
  storing names.
- **outbox_events** — transactional fan-out for emails/webhooks/aggregates.
- **PII key fingerprint** — first 12 hex chars of the passphrase hash;
  seed and app must match or names won't decrypt.
