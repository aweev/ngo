# NGO OS Command Center — Execution Tasks

## Wave 1: Database Schema
- [x] All 24 legacy `schema-*.sql` / `fix*.sql` files consolidated into 18 ordered, dependency-safe migrations in `supabase/migrations/` (originals archived in `supabase/archive/`; full map in `supabase/README.md`):
  - [x] `20240101000001_extensions_and_core_schema` — organizations, organization_members, workers
  - [x] `20240101000002_people` — volunteers, volunteer_hours
  - [x] `20240101000003_funding` — partners, donors, donations
  - [x] `20240101000004_programs_audit` — projects, campaigns, audit_logs
  - [x] `20240101000005_rbac_scheduling_reporting` — custom_roles, role_assignments, permission_overrides, scheduled_jobs, job_executions, report_definitions, report_snapshots
  - [x] `20240101000006_content_events_messaging_impact_finance` — content_pages, content_blocks, media_library, org_events, event_registrations, tags, tag_assignments, conversations, conversation_messages, impact_metrics, impact_measurements, impact_goals, budgets, budget_lines, expenses
  - [x] `20240101000007_notifications_integrations` — notification_templates, notifications, notification_preferences, integrations, webhooks, webhook_deliveries
  - [x] `20240101000008_automations_workflows` — automation_rules, automation_executions, automation_templates, workflow_definitions, workflow_instances, workflow_steps
  - [x] `20240101000009_governance_hr` — feature_flags, governance_approvals, performance_reviews, hr_lifecycle_records
  - [x] `20240101000010_public_forms_newsletter` — form_submissions, newsletter_subscribers
  - [x] `20240101000011_invitations` — invitations
  - [x] `20240101000012_functions_triggers` — shared functions + `updated_at` triggers (now on every eligible table)
  - [x] `20240101000013_indexes_foreign_keys` — all FKs + org_id indexes
  - [x] `20240101000014_rls_policies` — permission-aware RLS (now on every tenant table)
  - [x] `20240101000015_org_protection` — org_id immutability triggers
  - [x] `20240101000016_approval_triggers` — content.publish / finance.approve gates
  - [x] `20240101000017_storage_policies` — storage buckets + org-scoped policies
  - [x] `20240101000018_public_views` — public views + `public_impact_stats()`

## Wave 2: Types
- [x] All 14 planned domain type files plus `audit`, `donors`, `governance`, `messaging`, `organization`, `partners`, `projects`, `volunteers`, `workers` (22 total in `types/domain/`)
- [x] `types/index.ts` — exports extended to all new domain types

## Wave 3: Server Actions
- [x] All 14 planned action modules plus `auth`, `campaigns`, `donations`, `donors`, `governance`, `organization`, `partners`, `projects`, `public`, `volunteers`, `workers` (25 total in `actions/`)
- [x] `actions/index.ts` — exports extended

## Wave 4: Admin Layout & Navigation
- [x] `components/layout/admin/admin-sidebar.tsx` — full grouped nav rebuild
- [x] `components/layout/admin/command-menu.tsx` — full cmdk command palette
- [x] `components/layout/admin/admin-header.tsx` — breadcrumbs + user menu

## Wave 5: Shared Admin UI Components
- [x] `components/admin/cron-editor.tsx`
- [x] `components/admin/permission-matrix.tsx`
- [x] `components/admin/impact-metric-card.tsx`
- [x] `components/admin/integration-card.tsx`
- [x] `components/admin/data-export-button.tsx`
- [x] `components/admin/run-report-button.tsx` (added beyond plan)
- [x] `components/admin/automation-rule-builder.tsx`
- [x] `components/admin/workflow-builder.tsx`
- [x] `components/admin/report-builder.tsx`
- [x] `components/admin/form-builder.tsx`
- [x] `components/admin/notification-composer.tsx`

## Wave 6: Admin Pages — Operations
- [x] `admin/automations/page.tsx` + `automations/new/page.tsx`
- [x] `admin/automations/[id]/page.tsx` — detail/edit page
- [x] `admin/workflows/page.tsx` + `workflows/new/page.tsx`
- [x] `admin/workflows/[id]/page.tsx` — detail/edit page
- [x] `admin/scheduling/page.tsx`
- [x] `admin/scheduling/new/page.tsx`
- [x] `admin/forms/page.tsx` + `forms/new/page.tsx`
- [x] `admin/forms/[id]/page.tsx` — detail/submissions page

## Wave 7: Admin Pages — People & Programs
- [x] `admin/events/page.tsx`
- [x] `admin/events/new/page.tsx`
- [x] `admin/impact/page.tsx`
- [x] `admin/rbac/page.tsx`
- [x] `admin/rbac/roles/[id]/page.tsx` — role detail/permission editor

## Wave 8: Admin Pages — Finance & Comms
- [x] `admin/financial/page.tsx`
- [x] `admin/financial/budgets/page.tsx` — dedicated page
- [x] `admin/financial/expenses/page.tsx` — dedicated page
- [x] `admin/notifications/page.tsx`
- [x] `admin/notifications/templates/page.tsx`
- [x] `admin/messaging/page.tsx`
- [x] `admin/content/page.tsx`
- [x] `admin/tags/page.tsx`

## Wave 9: Admin Pages — System
- [x] `admin/integrations/page.tsx`
- [x] `admin/integrations/webhooks/page.tsx`
- [x] `admin/reporting/page.tsx` + `reporting/new/page.tsx`
- [x] `admin/reporting/[id]/page.tsx` — detail/snapshots page
- [x] `admin/settings/page.tsx` — expanded

## Wave 10: Admin Overview Page Upgrade
- [x] `admin/page.tsx` — full command center overview
- [x] `admin/layout.tsx` — new sidebar/header

Beyond plan (added): `admin/campaigns`, `admin/donors`, `admin/hr` + `hr/offboard`, `admin/partners`, `admin/projects`, `admin/reviews`, `admin/volunteers`, `admin/workers`, and the full `dashboard/` surface (restructured from the old `(dashboard)`/`(public)` route groups into `dashboard/` + `public/`).

## Phase 1: Establish the Foundation
- [x] `lib/auth/permissions.ts` — isomorphic permission registry + role model
- [x] `lib/auth/guards.ts` — require*/authorize* helpers (server-only)
- [x] `actions/organization.ts` — getMyOrganizations + switchActiveOrganization
- [x] `auth.ts` — rewritten to multi-org-aware Supabase auth()
- [x] Admin layout + sidebar + proxy — de-scattered role checks
- [x] All action modules rewritten with `authorizePermission()` + org-scoped queries
- [x] `scripts/verify-action-auth.mjs` — static gate PASS

## Phase 2: Make Multi-Tenancy Secure
- [x] `supabase/migrations/20240101000014_rls_policies.sql` — permission-aware RLS for all tables
- [x] `supabase/migrations/20240101000013_indexes_foreign_keys.sql` — missing FKs + org indexes
- [x] `supabase/migrations/20240101000015_org_protection.sql` — org_id immutability trigger
- [x] `supabase/migrations/20240101000016_approval_triggers.sql` — content.publish / finance.approve gates
- [x] `supabase/migrations/20240101000017_storage_policies.sql` — org-scoped storage bucket policies
- [x] `supabase/migrations/20240101000018_public_views.sql` — safe public views + impact stats function
- [x] `src/actions/public.ts` — reads from safe views (`public_campaigns` / `public_projects` / `public_partners`) + `public_impact_stats()` rpc
- [x] `permissions.ts` — audit.* added for DB/TS parity
- [/] `supabase/tests/rls-isolation-tests.sql` — written; live run pending Docker (`supabase db reset`)

## Validation
- [x] `pnpm typecheck` — 0 errors
- [x] `pnpm lint` — 0 errors (17 pre-existing errors fixed)
- [x] `pnpm test` — 56 unit tests pass (7 files: permissions, sanitizer, rate limiter, i18n locales/format, program routes, utils)
- [x] `pnpm build` — success (406 static pages, sitemap.xml ISR)
- [x] `pnpm verify:migrations` — 0 issues (30 migrations, full legacy parity, 61 tables / 13 views / 26 functions)
- [x] `pnpm verify:actions` — PASS (211 guarded+delegates / 38 public / 0 violations)
- [x] `pnpm verify:cta-links` — PASS (282 link targets)
- [x] `pnpm verify:i18n` — PASS (965 keys x 5 locales; fixed the mis-nested Onboarding block)
- [x] `supabase db push` — all 30 migrations applied, remote in sync (`migration list`)
- [x] `pnpm supabase:gen-types` — regenerated; union aliases moved to `src/types/database-enums.ts` so regeneration is idempotent
- [x] `supabase functions deploy --use-api` — 4 functions deployed; live check: 401 without secret, 200 with secret
- [x] `supabase secrets set CRON_SECRET` — set on the linked project
- [x] pg_cron installer pushed (`20260918000001_scheduled_runtime`); jobs activate once the Vault secret is created
- [/] `pnpm test:rls` — runner added and the SQL syntax bug fixed; live run pending a database password (no local connection string available)

## Known Gaps (next work)
- Create the Vault entry (`select vault.create_secret('<CRON_SECRET>', 'cron_secret')`) then run `select public.schedule_cron_jobs();` — see `supabase/README.md` > Release & operations runbook
- Run the RLS isolation suite once a DB password / `DATABASE_URL` is available (`pnpm test:rls`)
- E2E (Playwright) coverage for the 5 locales; error monitoring; privacy/retention documentation
