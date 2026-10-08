# 03 — Data Model

Source of truth: `supabase/migrations/` (ordered SQL; never edit applied
files). Generated types: `src/types/database.ts` (do not hand-edit);
hand-maintained domain types: `src/types/domain/`. Every tenant table
carries `organization_id`, has RLS enabled, and is covered by
`add_tenant_policies()` (verified by `verify-rls-isolation`, 83 tables).

Conventions: `updated_at` maintained by trigger; `organization_id` is
immutable after insert (`trg_prevent_org_change`); offline-capable tables
carry `offline_uuid UNIQUE` and/or `idempotency_key UNIQUE`.

## Field (Phase 1)

| Table | Key columns | Integrity |
|---|---|---|
| `households` | `head_name_encrypted`, `head_search_hash`, `location_text`, `member_count`, `consent_id`, `offline_uuid`, `device_id` | Consent row required by app flow; replay on `offline_uuid` |
| `beneficiaries` | `household_id→households`, `full_name_encrypted`, `search_hash`, `sex`, `age_band`, `disability`, `phone_encrypted`, `consent_id`, `is_archived`, `deleted_at`, `offline_uuid` | Sex/age/disability are CHECK enums (data minimization: no DOB); soft-delete only |
| `services` | `beneficiary_id`, `project_id`, `service_type`, `quantity>0`, `delivered_at`, `delivered_by`, `offline_uuid`, `idempotency_key` | Double-tap/replay safe on `idempotency_key` |
| `referrals` | `beneficiary_id`, `referred_to`, `reason`, `status` open/accepted/completed/closed/expired, `follow_up_at`, `offline_uuid` | Lifecycle in `updateReferralStatus` |
| `sync_conflicts` | `entity_type`, `entity_id`, `offline_uuid`, `local_data`, `server_data`, `status` open/resolved_local/resolved_server/merged | Human-resolved via `resolveSyncConflict` |
| `consent_records` | `subject_type`, `consent_type`, `policy_version`, `status` granted/withdrawn/expired | Written by `recordConsent()`; field policy `field-consent-v1` |

PII never stored in cleartext. `search_hash` = SHA-256 of
`lower(trim(name)) + ':field-pii:' + orgId` (see `src/lib/field-crypto.ts`
and the contract test `field-crypto-contract.test.ts`).

## Finance (Phases 0–2)

| Table | Key columns | Integrity |
|---|---|---|
| `funds` | `name` unique per org, `code`, `fund_type` unrestricted/temporarily_restricted/permanently_restricted, `currency`, `is_active` | Created/managed in trust center (`actions/trust.ts`) |
| `grants` | `fund_id`, `donor_id`, `grantor_name`, `grant_reference`, `title`, `amount_committed≥0`, `currency`, `indirect_cost_rate 0..1`, `allowable_costs JSONB`, `status` 7-state, `reporting_requirements JSONB` | Allowable costs enforced at approval: `{categories[], max_per_expense}` |
| `budgets` | `name`, `fiscal_year`, `period_type`, `total_amount`, `currency`, `status` draft/approved/active/closed, `project_id`, `fund_id`, `approved_by/at` | Status changes require `finance.approve` |
| `budget_lines` | `budget_id`, `category`, `allocated_amount`, `spent_amount`, `currency` | `spent_amount` maintained by trigger from approved/paid expenses; currency must match parent budget |
| `expenses` | `title`, `amount>0`, `currency`, `category`, `budget_id`, `budget_line_id`, `project_id`, `fund_id`, `status` pending/approved_first/approved/rejected/paid, `receipt_url`, `vendor`, `submitted_by`, `approved_by/at` | Currency-match trigger; no self-approval; two-step above threshold |
| `expense_approvals` | `expense_id`, `approver_id`, `step` 1/2, `decision`, `reason` | Every approve/reject writes a row |
| `cost_allocations` | `expense_id`, `grant_id`, `amount≥0`, `basis` direct/indirect, unique per (org, expense, grant, basis) | Shares must sum exactly to the expense; same-currency only |
| `exchange_rates` | `from_currency`, `to_currency`, `rate>0`, `rate_date`, `source`, unique per (org, pair, date) | Append-only corrections (new dated row, never edits) |
| `organizations` | `default_currency`, `expense_approval_threshold` (nullable = single approval) | Threshold `NULL` disables two-step |

## M&E and intake

| Table | Key columns | Integrity |
|---|---|---|
| `impact_metrics` | `name`, `slug` unique per org, `unit`, `category`, `baseline_value`, `current_value`, `target_value`, `is_public` | Public homepage reads `is_public` via safe view |
| `impact_measurements` | `metric_id`, `value`, `measured_at`, `data_source`, `verified_by` | Only path from raw intake is promotion (below) |
| `impact_goals` | `name`, `target_date`, `status`, `metrics JSONB`, `project_id` | Reviewed in `/admin/impact` |
| `field_report_senders` | `phone_number_e164` globally unique, `worker_id`, `default_project_id`, `status` pending/active/suspended/revoked | Unknown numbers are quarantined, never attributed |
| `field_reports` | `sender_id`, `project_id`, `metric_id`, `message_sid`, `idempotency_key` unique, `quantity NULL or >0`, `validation_state` quarantined/pending_review/verified/rejected/promoted, `promoted_measurement_id` | `promote_field_report()` is the ONLY path to a measurement; idempotent |
| `whatsapp_webhook_events` | `message_sid` unique, `signature_valid`, `outcome`, `payload_digest` | Replay protection + forensics, no PII retained |

## People, donors, programs

| Table | Key columns | Notes |
|---|---|---|
| `organization_members` | `organization_id`, `user_id` unique pair, `role` owner/admin/manager/member | Role source for `role_has_permission()` |
| `workers` / `volunteers` / `volunteer_hours` | Standard HR-lite fields; hours have approve flow | Candidates for Phase 4 merge into one directory |
| `partners` | `type`, `partnership_type`, `status`, `contract_value` | Implementing vs strategic |
| `donors` | `type`, `status`, `total_donated` (trigger-maintained), `currency` | Detail page joins donations + linked grants |
| `donations` | `donor_id`, `amount>0`, `currency`, `type`, `status`, `payment_method`, provider columns, `donated_at` | Stripe webhook or pledge fallback |
| `projects` | `slug` unique per org, `kind` program/campaign/event, `category`, `status`, `budget`, `beneficiaries_target/reached` | Counters are display caches, not case data |
| `campaigns` / `org_events` | Fundraising + event registration | Overlap with projects is a Phase 4 merge target |

## Reporting, trust, platform

| Table | Key columns | Notes |
|---|---|---|
| `report_definitions` | `slug` unique per org, `entity_type` (allowlisted), `filters JSONB` eq-pairs, `sort_field/direction` | Run path paginates to 5000 rows |
| `report_snapshots` | `report_id`, `row_count`, `data JSONB`, `query_hash` | Hash = SHA-256 of entity+filters+sort+day |
| `documents` / `evidence_links` | Private bucket paths, checksums, `scan_state`, classifications, consent links | Quarantine-until-clean pipeline |
| `audit_events` | Append-only (DB trigger blocks UPDATE/DELETE) | Every money/approval/export/merge writes here |
| `outbox_events` | Transactional fan-out (`enqueueOutboxEvent`) | Drained by edge functions |
| `exchange_rates`, `cost_allocations`, `expense_approvals` | See finance | Phase 2 |
| `exchange_rates` uniqueness | (org, pair, date) | One truth per day |
| `notifications*`, `conversations*`, `automation_*`, `workflow_*`, `integrations`, `webhooks`, `custom_roles`, `governance_approvals`, `tags*`, CMS tables | Legacy breadth | Phase 4 cut/merge targets — do not extend |

## Public safe views

`public_content_pages`, `public_content_blocks`, `public_impact_metrics`,
`public_campaigns`, `public_projects`, `public_partners`, `public_events`,
`public_organization` — published/public rows for
`public_default_org_id()` only (settings `public_site`, else oldest active
org). No private columns leak; anon + authenticated have SELECT.
