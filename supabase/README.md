# Supabase Setup Guide

This guide will help you set up Supabase for the NGO OS application.

> **Note:** The legacy `schema-*.sql` files have been consolidated into the ordered migration set in `supabase/migrations/` (53 files, latest `20261103000002_fix_schedule_cron_runtime.sql`; the step-4 table covers the original migrations 01–18). The originals are preserved in `supabase/archive/` for reference only — do not run them.

## EGM Contract (Repository Root — Hay)

## Classification
Repository Root (Blueprint / Hay) — no direct application source code; rolls up child code contracts (`archive/`, `functions/`, `migrations/`). Seed SQL files and `config.toml` live at this level.

## Child contracts
- `./archive/README.md` — Component Package (Peanut): 24 superseded `.sql` schemas (reference only, do not run)
- `./functions/README.md` — Intermediate Blueprint (Hay): 4 Edge Functions (`cron-runner`, `automation-engine`, `notification-dispatcher`, `webhook-delivery`) + `./_shared/`
- `./migrations/README.md` — Component Package (Peanut): 53 ordered `.sql` migrations (source of truth for the live schema)

## Interface (public symbols)
| Symbol | File | Kind | Notes |
|---|---|---|---|
| `[functions.*]` blocks (`cron-runner`, `automation-engine`, `webhook-delivery`, `notification-dispatcher`) | `config.toml:426`–`448` | TOML config | `verify_jwt = false`; entrypoint `./functions/<name>/index.ts`; import map `./functions/deno.json` |
| `seed.sql` default organization insert | `seed.sql:12` | SQL DML | Inserts `AWE e.V.` / slug `awe-ev`; runs on `db reset` ONLY (not `db push`) |
| `seed-p0-production-content.sql` | `seed-p0-production-content.sql` | SQL DML | P0 production content seed |

## Invariants
- All four Edge Functions set `verify_jwt = false`; the auth boundary is the shared `CRON_SECRET` (`x-cron-secret` header) enforced by `functions/_shared/runtime.ts` (`requireCronSecret`) ([`config.toml:426`–`448`]).
- Migrations are applied in filename (timestamp) order; `schema_paths = []` (migrations live in `./migrations/`) ([`config.toml:59`–`64`]).
- Seed data (`seed.sql`) is applied on `npx supabase db reset` ONLY, never on `db push`; production starts empty ([`seed.sql:5`–`9`]).

## Side Effects
- `npx supabase db push` / `db reset` mutates the database schema (CREATE/ALTER TABLE, RLS, functions, triggers) — the intended effect of migration application.
- `public.schedule_cron_jobs()` writes `cron.job` (pg_cron jobs) once `pg_cron`, `pg_net`, and the `cron_secret` Vault entry exist ([`migrations/20260918000001_scheduled_runtime.sql`]).
- `seed.sql` inserts the default organization `AWE e.V.` ([`seed.sql:12`]).

## Verification command
`pnpm verify` (typecheck → lint → unit tests → migrations/actions/CTA/i18n gates); `npm run verify:migrations`; `npx supabase db push`; `npx supabase functions deploy --use-api --yes`

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project created

## Setup Steps

### 1. Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Enter a name for your project
4. Set a secure database password
5. Choose a region close to your users
6. Click "Create new project"

### 2. Get Your API Keys

1. Go to Project Settings > API
2. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase credentials

```bash
cp .env.example .env.local
```

### 4. Run Database Migrations

The database schema is versioned as 53 ordered SQL migrations in `supabase/migrations/` (latest `20261103000002_fix_schedule_cron_runtime.sql`; the step-4 table covers the original migrations 01–18, with migrations 19–53 extending the runtime, reliability kernel, trust kernel, and phase 0–2 finance truth). The legacy `schema-*.sql` files were consolidated into these; originals are in `supabase/archive/`.

**Option A — Supabase CLI (recommended):**

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push    # apply all pending migrations to the linked project
```

For a local instance (`npx supabase start`), `npx supabase db reset` re-applies every migration from scratch.

**Option B — SQL Editor:** run each migration file in order:

| # | Migration | Contents |
|---|-----------|----------|
| 01 | `20240101000001_extensions_and_core_schema` | Extensions; `organizations`, `organization_members`, `workers` |
| 02 | `20240101000002_people` | `volunteers`, `volunteer_hours` |
| 03 | `20240101000003_funding` | `partners`, `donors`, `donations` |
| 04 | `20240101000004_programs_audit` | `projects`, `campaigns`, `audit_logs` |
| 05 | `20240101000005_rbac_scheduling_reporting` | `custom_roles`, `role_assignments`, `permission_overrides`, `scheduled_jobs`, `job_executions`, `report_definitions`, `report_snapshots` |
| 06 | `20240101000006_content_events_messaging_impact_finance` | `content_pages`, `content_blocks`, `media_library`, `org_events`, `event_registrations`, `tags`, `tag_assignments`, `conversations`, `conversation_messages`, `impact_metrics`, `impact_measurements`, `impact_goals`, `budgets`, `budget_lines`, `expenses` |
| 07 | `20240101000007_notifications_integrations` | `notification_templates`, `notifications`, `notification_preferences`, `integrations`, `webhooks`, `webhook_deliveries` |
| 08 | `20240101000008_automations_workflows` | `automation_rules`, `automation_executions`, `automation_templates`, `workflow_definitions`, `workflow_instances`, `workflow_steps` |
| 09 | `20240101000009_governance_hr` | `feature_flags`, `governance_approvals`, `performance_reviews`, `hr_lifecycle_records` |
| 10 | `20240101000010_public_forms_newsletter` | `form_submissions`, `newsletter_subscribers` |
| 11 | `20240101000011_invitations` | `invitations` |
| 12 | `20240101000012_functions_triggers` | Shared functions and their triggers |
| 13 | `20240101000013_indexes_foreign_keys` | All foreign keys and indexes |
| 14 | `20240101000014_rls_policies` | Row Level Security policies for all tables |
| 15 | `20240101000015_org_protection` | `org_id` immutability triggers (multi-tenant protection) |
| 16 | `20240101000016_approval_triggers` | Content publish / finance approve gates |
| 17 | `20240101000017_storage_policies` | Storage buckets and org-scoped storage policies |
| 18 | `20240101000018_public_views` | Public views (`public_campaigns`, `public_projects`, `public_partners`) and `public_impact_stats()` |

### 5. Enable Authentication Providers

1. Go to Authentication > Providers
2. Enable **Email** provider (enabled by default)
3. Optionally enable OAuth providers:
   - Google
   - GitHub
   - GitLab

### 6. Configure Email Templates

1. Go to Authentication > Email Templates
2. Customize the following templates:
   - Confirm Signup
   - Reset Password
   - Magic Link
   - Change Email

### 7. (Optional) Enable Realtime

If you need real-time features:

1. Go to Database > Replication
2. Enable replication for the tables you want to monitor

## Database Schema Overview

The full schema (52 tables) is defined by migrations 01–11 (see the map in step 4). Core tables:

### Core Tables

| Table | Description |
|-------|-------------|
| `organizations` | Multi-tenant organizations |
| `organization_members` | User-organization join table with roles |
| `workers` | Staff/employees |
| `volunteers` | Volunteers |
| `volunteer_hours` | Volunteer time tracking |
| `partners` | Partner organizations |
| `donors` | Donors |
| `donations` | Donation records |
| `projects` | Projects/Programs |
| `campaigns` | Fundraising campaigns |
| `audit_logs` | Audit trail |

### Roles

- **owner**: Full organization control
- **admin**: Administrative access
- **manager**: Department management
- **member**: Basic access

## Security

### Row Level Security (RLS)

All tables have RLS enabled. Policies ensure:
- Users can only access data from their organization
- Only owners/admins can modify organization settings
- Only admins/managers can manage workers, volunteers, partners, donors

Cross-tenant isolation and per-role assertions can be verified with `supabase/tests/rls-isolation-tests.sql`.

### Storage

File uploads are organized in buckets:
- `organization-logos` - Public
- `worker-documents` - Private
- `volunteer-documents` - Private
- `partner-documents` - Private
- `project-images` - Public
- `campaign-images` - Public

## Useful Commands

```bash
# Link to your Supabase project
npx supabase link --project-ref <your-project-ref>

# Apply pending migrations to the linked remote project
npx supabase db push

# Start local Supabase (requires Docker)
npx supabase start

# Reset local database (re-runs all migrations from scratch)
npx supabase db reset

# Create a new migration
npx supabase migration new migration_name

# List applied / pending migrations
npx supabase migration list

# Statically verify the migration set (ordering, forward references, legacy parity)
npm run verify:migrations

# Generate TypeScript types from your database
npx supabase gen types typescript --linked > src/types/database.ts
```

## Troubleshooting

### "new row violates row-level security policy"

This means the user doesn't have permission to perform the action. Check:
1. The user is authenticated
2. The user has the correct role
3. The RLS policy allows the operation

### "JWT token expired"

The session has expired. The middleware should automatically refresh it. If not:
1. Check your Supabase project's JWT settings
2. Ensure the middleware is running correctly

### Storage upload fails

1. Check the bucket exists
2. Check the storage policy allows the operation
3. Verify the file size is within limits

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js with Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage](https://supabase.com/docs/guides/storage)

## Release & operations runbook (verified)

Current repo state (recomputed from this checkout; confirm remote parity with
`npx supabase migration list`):

| Item | State |
|---|---|
| Migrations | **53 files** in `supabase/migrations/` (latest `20261103000002_fix_schedule_cron_runtime`); apply with `npx supabase db push`, then confirm Local == Remote via `npx supabase migration list` |
| Schema | 87 tables, 16 views, 49 functions, 67 policies, 48 triggers, 158 indexes (`pnpm verify:migrations`, recomputed from this repo) |
| Edge functions | 4 in `supabase/functions/` — `cron-runner`, `webhook-delivery`, `notification-dispatcher`, `automation-engine` (all `verify_jwt = false`; deploy via step 3) |
| Scheduled runtime | pg_cron installer in place; jobs activate once the Vault secret exists (step 5) |

### 1. Apply migrations

```bash
npx supabase db push          # apply pending migrations to the linked project
npx supabase migration list   # confirm Local == Remote for every row
```

If a local file predates the newest remote migration (e.g. a back-dated fix),
the CLI refuses by default — re-run with `--include-all`.

### 2. Regenerate database types

```bash
pnpm supabase:gen-types       # writes src/types/database.ts (generated, do not hand-edit)
```

> The generated file only contains tables/RPCs. The string-union aliases the
> domain types use (`VolunteerStatus`, `PartnerType`, …) live in the
> hand-maintained `src/types/database-enums.ts`, so regeneration can never
> delete them. Add new unions there, mirroring the migration's CHECK constraint.

### 3. Deploy edge functions

```bash
npx supabase functions deploy --use-api --yes
```

`--use-api` bundles server-side, so **no Docker is required**. `verify_jwt`
and the import map come from the `[functions.*]` blocks in `config.toml`
(all four use `verify_jwt = false`; the shared `CRON_SECRET` is the auth
boundary).

Type-check them first with `pnpm verify:functions`: it runs the authoritative
`deno check` when Deno is installed (CI does, via `denoland/setup-deno@v2`, and
sets `REQUIRE_DENO=1` so a missing binary fails loudly) and falls back to
`tsc -p tsconfig.functions.json` + `deno-edge-shim.d.ts` otherwise. They are
excluded from the app `tsconfig.json` (those files run on Deno), so this gate is
the only thing that parses them. It is wired into `pnpm verify`.

### 4. Set the runtime secret

```bash
npx supabase secrets set CRON_SECRET=<random-32-bytes>
```

The functions compare the `x-cron-secret` header against this value
(`supabase/functions/_shared/runtime.ts` → `requireCronSecret`). Verified live:

```text
POST /functions/v1/cron-runner           -> 401
POST /functions/v1/cron-runner + secret  -> 200 {"ok":true,"evaluated":0,"outcomes":[]}
```

### 5. Activate the scheduled runtime (one manual step)

The jobs read the secret from Vault at run time, so it is never stored in
`cron.job`. Run once in the SQL editor (same value as step 4):

```sql
select vault.create_secret('<CRON_SECRET>', 'cron_secret', 'scheduled runtime');
select public.schedule_cron_jobs();   -- idempotent: safe to re-run any time
```

`schedule_cron_jobs()` reports what it did, e.g. `scheduled 3 job(s) against …`.
It returns a `skipped:` message instead of failing when pg_cron is not enabled
or the Vault entry is missing, and it unschedules jobs whose contract no longer
exists (e.g. the retired `automation-engine-5min` poller).

Cadence (every request carries `x-cron-secret`, read from Vault at run time):

| Job | Method | Schedule | Purpose |
|---|---|---|---|
| `cron-runner` | POST | every minute | drives the event spine (outbox → `webhook-delivery` + `automation-engine`, per ADR-0001) and any due `scheduled_jobs` |
| `webhook-delivery` | GET | every minute | redrives undelivered `webhook_deliveries` rows (claim-based; backoff, then abandon) |
| `notification-dispatcher` | GET | every 5 minutes | drains queued notifications (claim-based; honours recipient preferences) |

The dispatcher's email/SMS/push channels deliver by POSTing a JSON payload to
`SMTP_URL` / `SMS_PROVIDER_URL` / `PUSH_PROVIDER_URL` (set via
`npx supabase secrets set ...`; despite the name, `SMTP_URL` is an HTTP
endpoint, not an SMTP connection string). In-app and webhook channels need no
extra secret. Unset provider URLs leave those channels queued with backoff —
nothing sends, nothing is lost.

`automation-engine` is deliberately **not** scheduled: it has no queue to poll —
`cron-runner` invokes it with a `rule_id` or an `event` + `organization_id`.

### 6. RLS isolation tests against a real database

```bash
# needs the database password (the linked pooler URL intentionally has none)
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres" pnpm test:rls
# or pass it as the first argument:
node scripts/run-rls-tests.mjs "postgresql://…"
```

The runner wraps `supabase/tests/rls-isolation-tests.sql` in one transaction and
always rolls back, so it is safe against a live database — it seeds two
organizations, impersonates every role through `request.jwt.claim.sub`, asserts
cross-tenant isolation and the permission gates, then discards everything.

The scheduled runtime has its own live suite:

```bash
DATABASE_URL="postgresql://..." pnpm test:runtime
# or
node scripts/run-runtime-tests.mjs "$DATABASE_URL"
```

It installs `supabase/tests/schedule-runtime-shims.sql` (a no-op on a real
Supabase stack, a stand-in for the roles/pg_net/cron/vault surface on bare
PostgreSQL), applies
`20261103000002_fix_schedule_cron_runtime.sql`, asserts the claim RPC and the
pg_cron job contract — `http_post` for `cron-runner`, `http_get` for both drain
jobs, the retired `automation-engine` poller removed, idempotent re-runs,
https-only URLs — and rolls back. CI runs it against the same Supabase stack as
the RLS suite.

### 7. Full local gate before deploying

```bash
pnpm verify   # typegen-less: typecheck -> lint -> unit tests -> migrations/actions/CTA/i18n gates
pnpm build    # production build
```

