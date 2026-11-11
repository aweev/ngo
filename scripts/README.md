# scripts — Verification gates, seed scripts & test runners (Peanut)

**Classification:** Component Package (Peanut) — this directory contains direct source
code files (standalone CLI scripts) and no subdirectories that carry their own
contracts. It is a leaf package, not a repository blueprint (Hay).

**Scope:** `scripts/` (flat, no child directories). Every file here is an executable
Node entry point (`*.mjs`, `*.cjs`, `*.ps1`) invoked from CI (`pnpm verify`) or by
developers locally. None of these scripts import application source; they read
migrations, edge functions, actions, messages, and the lockfile, and (for the seed
and DB-test runners) write to a live Supabase database.

## Purpose

The `scripts/` subtree hosts the project's static verification gates (audit
Waves 0–3) plus local-development seed and database-test runners. The gates are
read-only and fail CI (`process.exit(1)`) on any contract violation; the seed
runners are guarded behind a `--confirm` flag and write real data only to a linked
project; the DB test runners always execute inside a single transaction that is
rolled back, so they are safe to point at a live database.

## Interface

Public contract = each file's CLI entry point plus the exported/named symbols it
relies on. All scripts resolve paths relative to `import.meta.url` / `__dirname`
so they are cwd-independent.

| File | Entry / symbols | Run command | Exit codes |
|------|-----------------|-------------|------------|
| [`verify-i18n.mjs`](./verify-i18n.mjs) | `flatten(obj, prefix)` [internal]; CLI reads `messages/*.json` vs `messages/en.json` | `node scripts/verify-i18n.mjs` | `0` all locales match `en.json`; `1` key mismatch |
| [`verify-i18n-hardcoded.mjs`](./verify-i18n-hardcoded.mjs) | `RULES` (jsx-attr, jsx-text, obj-label, toast) [internal]; `SCAN_DIRS`; `ALLOWLIST_FILE` | `node scripts/verify-i18n-hardcoded.mjs` | `0` no violations outside allowlist; `1` violation(s) |
| [`verify-i18n-usage.mjs`](./verify-i18n-usage.mjs) | `findBindings(source)` [internal], `hasPath(path)` [internal]; `SCAN_DIRS` (`src/app`, `src/components`, `src/lib`) | `node scripts/verify-i18n-usage.mjs` | `0` every referenced key exists; `1` missing key(s) |
| [`verify-functions.mjs`](./verify-functions.mjs) | `findDeno()` [internal], `entrypoints()` [internal]; type-checks `supabase/functions/*/index.ts` | `node scripts/verify-functions.mjs` | `0` type check passed; `1` failure |
| [`verify-licenses.mjs`](./verify-licenses.mjs) | `DENIED` [internal], `expressionAllowed(expression)` [internal]; allowlist `scripts/license-allowlist.json` | `node scripts/verify-licenses.mjs` | `0` policy satisfied; `1` violation |
| [`verify-cta-links.mjs`](./verify-cta-links.mjs) | `PUBLIC_ROUTE_FAMILIES`, `PUBLIC_PREFIX` (`/public`), `VALID_CATEGORY_SLUGS`, `LINK_TARGET_RE`, `SKIP_FILES` (`src/proxy.ts`) [internal]; `SCAN_ROOTS` (`src/app`, `src/components`, `src/lib`, `src/hooks`, `tests`) | `node scripts/verify-cta-links.mjs` | `0` all targets resolve; `1` violation found |
| [`verify-action-auth.mjs`](./verify-action-auth.mjs) | `ACTIONS_DIR` (`src/actions`), `PUBLIC_ALLOWLIST`, `GUARD_RE`, `DB_ACCESS_RE`, `exportedFunctions(source)` [internal] | `node scripts/verify-action-auth.mjs` | `0` all actions guarded; `1` violation found |
| [`verify-migrations.mjs`](./verify-migrations.mjs) | `migrationsDir` (`supabase/migrations`), `archiveDir` (`supabase/archive`) [internal] | `node scripts/verify-migrations.mjs` | `0` pass; `1` fail |
| [`verify-migrations.ps1`](./verify-migrations.ps1) | PowerShell port of `verify-migrations.mjs` | `pwsh -File scripts/verify-migrations.ps1` | `0` passed; `1` failed |
| [`report-i18n-violations.cjs`](./report-i18n-violations.cjs) | Same `RULES` as `verify-i18n-hardcoded.mjs`; `--files-only` flag; read-only reporter | `node scripts/report-i18n-violations.cjs [--files-only]` | never exits non-zero on violations |
| [`run-rls-tests.mjs`](./run-rls-tests.mjs) | `resolveUrl()` [internal]; runs `supabase/tests/rls-isolation-tests.sql` via `pg.Client` | `node scripts/run-rls-tests.mjs [conn]` | `0` all assertions passed; `1` failure |
| [`run-runtime-tests.mjs`](./run-runtime-tests.mjs) | `resolveUrl()` [internal]; applies shims + `20261103000002_fix_schedule_cron_runtime.sql` + assertions | `node scripts/run-runtime-tests.mjs [conn]` | `0` all assertions passed; `1` failure |
| [`seed-master.mjs`](./seed-master.mjs) | `fieldKey(passphrase, organizationId)`, `encryptPii(plainText, key)`, `nameHash(name, organizationId)`, `ensureRow(supabase, table, match, insert)` [internal]; `--confirm` | `node scripts/seed-master.mjs --confirm [--org <org-id>]` | `0` seeded; `1` failure |
| [`seed-personas.mjs`](./seed-personas.mjs) | `loadEnv()`, `shutdown(code)`, `findUserByEmail`, `createPersonaUser` [internal]; `--confirm` | `node scripts/seed-personas.mjs --confirm [--org <org-id>] [--domain <domain>]` | `0` seeded; `1` failure |
| [`verify-db-projections.mjs`](./verify-db-projections.mjs) | `EXPECTED_VIEWS` (14), `EXPECTED_FUNCTIONS` (5), `REQUIRED_COLUMNS`, `resolveConnectionString()` [internal]; Mode A static + Mode B live | `node scripts/verify-db-projections.mjs` | `0` all executed checks pass; `1` any fail |
| [`verify-reliability.mjs`](./verify-reliability.mjs) | `read(p)`, `check(name, ok, detail)` [internal]; audits migration `20260922000006_reliability_outbox.sql`, edge functions `_shared/`, `cron-runner`, `automation-engine`, `notification-dispatcher`, `webhook-delivery`, `src/lib/reliability.ts`, `/api/metrics`, incidents runbook, Stripe webhook, `src/actions/volunteers.ts` | `node scripts/verify-reliability.mjs` | `0` invariants hold; `1` failing check(s) |
| [`verify-rls-isolation.mjs`](./verify-rls-isolation.mjs) | `GLOBAL_TABLE_ALLOWLIST`, `CREATE_TABLE_RE`, `RLS_ENABLE_RE`, `TENANT_POLICY_FN_RE`, `CREATE_POLICY_RE`, `GENERATOR_ENABLES_RLS_FROM_FILE` (`20260925000001_rls_hardening.sql`) [internal] | `node scripts/verify-rls-isolation.mjs` | `0` PASS; `1` FAIL |

### CLI conventions
- Every `*.mjs`/`*.cjs` script is `#!/usr/bin/env node` and exits with a POSIX code
  (`0` = pass, `1` = fail) so they compose in `pnpm verify`.
- Seed runners (`seed-master.mjs`, `seed-personas.mjs`) refuse to write without the
  `--confirm` flag and require `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
  from `.env.local` (server-only, never shipped).
- DB test runners (`run-rls-tests.mjs`, `run-runtime-tests.mjs`) resolve the
  connection string in this order: first non-flag CLI argument → `DATABASE_URL` →
  `supabase/.temp/pooler-url`, require a password-bearing URL, and always `ROLLBACK`.
- `verify-functions.mjs` prefers the real `deno` binary (authoritative, CI-installed)
  and falls back to `tsc -p tsconfig.functions.json` + `deno-edge-shim.d.ts` locally;
  set `REQUIRE_DENO=1` to make a missing Deno a hard failure.

## Invariants

The following invariants are enforced by the gates. Each cites the file(s) that
assert it.

- **i18n parity** — every `messages/*.json` locale defines the same key set as
  `messages/en.json` (source of truth). Missing keys render as raw IDs at runtime
  and next-intl throws in dev, so drift must fail CI.
  - [`verify-i18n.mjs`](./verify-i18n.mjs)
- **No bypassing next-intl** — admin/dashboard/member UI surfaces must not contain
  literal English copy (`title=`, `description=`, `placeholder=`, `aria-label=`, `alt=`,
  capitalized JSX text nodes, object labels, `toast.*("...")` literals). Escape hatch:
  `// i18n-exempt: <reason>` or `scripts/i18n-hardcoded-allowlist.json` (reported as
  PENDING, non-failing).
  - [`verify-i18n-hardcoded.mjs`](./verify-i18n-hardcoded.mjs), [`report-i18n-violations.cjs`](./report-i18n-violations.cjs)
- **Every referenced translation key exists** — every `useTranslations("NS")` /
  `getTranslations("NS")` binding's namespace + key must resolve in `messages/en.json`.
  Dynamic (template-literal) keys are skipped, not failed.
  - [`verify-i18n-usage.mjs`](./verify-i18n-usage.mjs)
- **Every Server Action is guarded** — each exported function in `src/actions/*.ts`
  must call an auth guard (`authorizeUser`, `authorizeOrganization`,
  `authorizePermission`, `authorizeRole`, `requireUser`, `requirePermission`,
  `requireOrganization`, `requireRole`) before any DB access, or be declared
  intentionally public in `PUBLIC_ALLOWLIST` (`public|*`, `portal-experience|*`,
  `auth|validateInvitation`, `auth|acceptInvitation`, `email|*`).
  - [`verify-action-auth.mjs`](./verify-action-auth.mjs)
- **CTA links resolve under `/public`** — every internal link target for public route
  families (`/get-involved`, `/contact`, `/stories`, `/news`, `/programs`,
  `/campaigns`, `/events`, `/about`) must carry the `/public` prefix, and
  `/public/programs/<category>` must use one of `economic-empowerment`,
  `education`, `health`, `social-integration` (see `src/lib/program-themes.ts`).
  `src/proxy.ts` is excluded (middleware matcher fragments, not links).
  - [`verify-cta-links.mjs`](./verify-cta-links.mjs)
- **Allowed production licenses only** — no production dependency may carry AGPL/GPL
  (LGPL allowed), SSPL, BSL/BUSL, CC-BY-NC, UNLICENSED, UNKNOWN, or "SEE LICENSE IN ...".
  SPDX `A OR B` passes when any branch is allowed; `A AND B` requires all branches.
  Exceptions go in `scripts/license-allowlist.json`.
  - [`verify-licenses.mjs`](./verify-licenses.mjs)
- **Deno edge functions type-check** — every `supabase/functions/*/index.ts` entrypoint
  must pass `deno check` (authoritative) or the `tsc` fallback (`tsconfig.functions.json` +
  `deno-edge-shim.d.ts`).
  - [`verify-functions.mjs`](./verify-functions.mjs)
- **Migration static integrity** — filenames follow `202401010000NN_` sequence (no gaps,
  no duplicates), balanced single/double/`$$` quotes, paired `BEGIN`/`COMMIT`,
  trailing newline, no `TODO`/`FIXME`/`HACK`/`PLACEHOLDER`/`XXX`, no forward references
  (FK/POLICY/TRIGGER/INDEX/RLS/GRANT against not-yet-created tables/functions), no
  tables/views recreated without a `DROP`, and parity with `supabase/archive/` legacy
  files (every legacy table/function covered by migrations).
  - [`verify-migrations.mjs`](./verify-migrations.mjs), [`verify-migrations.ps1`](./verify-migrations.ps1)
- **RLS + tenant-scoped policy on every tenant table** — RLS must be enabled (either via
  the schema-wide loop or an explicit `ENABLE ROW LEVEL SECURITY` on tables created after
  the loop), and every non-allowlisted table must have a policy filtering on
  `organization_id`. Allowlisted tables (`stripe_events`, `spatial_ref_sys`,
  `schema_migrations`, `organizations`, `rate_limit_counters`, `whatsapp_webhook_events`)
  still require RLS enabled. From `20260925000001_rls_hardening.sql` onward,
  `add_tenant_policies('table')` also proves RLS enabled.
  - [`verify-rls-isolation.mjs`](./verify-rls-isolation.mjs)
- **Reliability invariants** (audit Wave 3) — atomic job/notification/outbox claiming
  (`FOR UPDATE SKIP LOCKED`), retries with exponential backoff + dead-letter state,
  idempotent side effects (webhook deliveries, outbox enqueue via `idempotency_key`),
  honest cron results (sibling failures never recorded as success, gated by
  `x-cron-secret`), and the `/api/metrics` endpoint gated by `METRICS_TOKEN` that the
  incidents runbook alerts on.
  - [`verify-reliability.mjs`](./verify-reliability.mjs)
- **Public data boundary is real** — the public site reads only `public_*` views and
  `public_*` SECURITY DEFINER functions; every expected view/function is declared in
  migrations, grants `SELECT`/`EXECUTE` to `anon`, required webhook/form columns exist,
  and RLS is enabled on every tenant table at runtime (Mode B live checks when a
  connection resolves).
  - [`verify-db-projections.mjs`](./verify-db-projections.mjs)

## Side Effects

- **Read-only gates** (no writes): [`verify-i18n.mjs`](./verify-i18n.mjs),
  [`verify-i18n-hardcoded.mjs`](./verify-i18n-hardcoded.mjs),
  [`verify-i18n-usage.mjs`](./verify-i18n-usage.mjs),
  [`verify-functions.mjs`](./verify-functions.mjs),
  [`verify-licenses.mjs`](./verify-licenses.mjs) (spawns `pnpm licenses list` — reads
  `pnpm-lock.yaml`; on Windows resolves pnpm via `.cmd` shim through a shell),
  [`verify-cta-links.mjs`](./verify-cta-links.mjs),
  [`verify-action-auth.mjs`](./verify-action-auth.mjs),
  [`verify-migrations.mjs`](./verify-migrations.mjs),
  [`verify-migrations.ps1`](./verify-migrations.ps1),
  [`report-i18n-violations.cjs`](./report-i18n-violations.cjs) (read-only reporter, never
  exits non-zero on violations),
  [`verify-db-projections.mjs`](./verify-db-projections.mjs) (Mode A static; Mode B live
  reads only),
  [`verify-reliability.mjs`](./verify-reliability.mjs),
  [`verify-rls-isolation.mjs`](./verify-rls-isolation.mjs).
  All print to `stdout`/`stderr` and terminate via `process.exit(code)`.

- **Database writers (guarded by `--confirm`)**: [`seed-master.mjs`](./seed-master.mjs)
  and [`seed-personas.mjs`](./seed-personas.mjs) write real users/memberships/demo rows
  to the linked Supabase project using the service role (bypasses RLS). Idempotent —
  safe to re-run; fills gaps only. `.env.local` values are never shipped.

- **Database test runners (transactional, no persistent changes)**:
  [`run-rls-tests.mjs`](./run-rls-tests.mjs) and [`run-runtime-tests.mjs`](./run-runtime-tests.mjs)
  connect to a live database, run SQL inside one transaction, and always `ROLLBACK`
  (even on assertion failure), leaving no rows or schema behind. Require the `pg`
  dependency (`pnpm add -D pg`).

- **Local crypto contract** (seed only, no network): [`seed-master.mjs`](./seed-master.mjs)
  derives PII encryption via PBKDF2-SHA256 (100k iterations) → AES-256-GCM
  (`payload = base64(iv12 || ct || tag)`), byte-identical to `src/lib/field-crypto.ts`.
  Falls back to `ngo-os-insecure-dev-only-do-not-use-in-production` when
  `ENCRYPTION_KEY` is unset (local demo only; a fingerprint is printed so the app and
  seed must use the same key).

## Child directories

None — `scripts/` is flat and contains only contract-bearing source files. No
subdirectory contract links apply.
