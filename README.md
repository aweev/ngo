# AWE System — Web (NGO OS)

Fullstack Next.js application for the AWE NGO operating system: public website,
donor/volunteer intake, and a multi-tenant admin command center, backed by
Supabase (Postgres + Auth + Storage) with optional Stripe Checkout donations.

## Stack

| Layer      | Technology |
|------------|------------|
| Framework  | Next.js 16 (App Router) + React 19 |
| Data       | Supabase (`@supabase/ssr`) — RLS multi-tenancy, safe public views |
| Payments   | Stripe Checkout (optional; falls back to recorded pledges) |
| i18n       | next-intl — en, de, fr, es, ar (RTL) |
| UI         | Tailwind CSS 4 + shadcn/radix, PWA via `@ducanh2912/next-pwa` |
| Validation | zod (env schema + public intake inputs) |

## Quickstart

```bash
# Node >= 22.12 (see engines), pnpm 9
pnpm install
cp .env.example .env.local   # then fill in your Supabase project values
pnpm dev                     # http://localhost:3000
```

Supabase setup (project, migrations, edge functions): see
[`supabase/README.md`](./supabase/README.md). Database schema is versioned in
`supabase/migrations/` — never edit the archived legacy files.

## Environment variables

All variables are declared and validated in `src/lib/env.ts` (zod). See
[`.env.example`](./.env.example) for the full list:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | ✅ | Canonical site URL (metadata, robots, sitemap) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public Supabase project credentials |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Server-only; bypasses RLS (webhook + privileged ops) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | optional | Enables real Checkout; unset = pledge mode |
| `CMS_TRANSLATION_PROVIDER` / `CMS_TRANSLATION_API_KEY` | optional | Enables AI translation in the CMS |

## Scripts

```bash
pnpm dev                 # dev server
pnpm build               # production build
pnpm typegen             # regenerate Next.js route types (run before typecheck in CI)
pnpm typecheck           # tsc --noEmit
pnpm lint                # eslint
pnpm verify              # typecheck + lint + all static gates below
pnpm verify:migrations   # static SQL migration checks (quotes, ordering, RLS parity)
pnpm verify:actions      # every server action must be auth-guarded or allowlisted
pnpm verify:cta-links    # every CTA must resolve to a real public route
pnpm supabase:gen-types  # regenerate src/types/database.ts from the linked project
pnpm seed:personas        # 4 staff users (owner/admin/manager/member) + org bootstrap
pnpm seed:master          # full coherent demo dataset (see docs/11-seeding-and-demo.md)
```

## Architecture map

```
src/
  app/[locale]/public/    Public website (CMS-driven, ISR + tag revalidation)
  app/[locale]/field/     Offline-first field PWA (register, log, sync)
  app/[locale]/dashboard/ Member dashboard
  app/[locale]/admin/     Admin command center (permission-gated)
  app/api/stripe/webhook/ Donation confirmation (signature-verified, service role)
  actions/                Server Actions — every export passes an auth guard
  lib/auth/               Permission registry + authorize*/require* guards
  lib/supabase/           SSR/admin/route/middleware/public clients
  lib/field-records.ts    Consent + PII encryption + idempotent field writes
  lib/offline/            IndexedDB outbox + sync engine (ack-only removal)
  lib/content/            CMS view-models + rich-text sanitizer
  store/ hooks/ providers/ components/
supabase/
  migrations/             Ordered SQL migrations (source of truth)
  functions/              Edge functions (cron-runner, automation-engine, …)
  tests/                  RLS isolation tests (run against a live/local DB)
```

Auth flow: `src/proxy.ts` guards `/admin` + `/dashboard`, refreshes Supabase
sessions, and enforces MFA step-up; server-side authorization is centralized in
`src/lib/auth/guards.ts` and enforced per-action via `authorizePermission()`.

## CI

`.github/workflows/web-ci.yml` runs on every push/PR touching `apps/web`:
install → `typegen` → `typecheck` → `lint` → all three static verify gates →
`build`. Keep `pnpm verify` green locally before pushing.

## Further docs

Start at [`docs/README.md`](./docs/README.md) — the full documentation index
(vision, architecture, data model, security, finance, field ops, admin
guide, deployment, operations, testing, seeding, roadmap, glossary).

- [`docs/production-readiness-notes.md`](./docs/production-readiness-notes.md) — historical gaps & release gate (partially superseded by Phases 0–2; see banner)
- [`docs/programs-production-plan.md`](./docs/programs-production-plan.md) — programs vertical plan
- [`docs/planning/task.md`](./docs/planning/task.md) — build-wave execution log
- [`MIGRATION-GUIDE.md`](./MIGRATION-GUIDE.md) — Go API → Next.js + Supabase architecture migration

---

## EGM Contract (Repository Root — Hay)

### Classification
Repository Root (Blueprint / Hay) — rolls up child code contracts (`scripts/`,
`supabase/`, `src/`) plus documentation (`docs/`). No direct application source
code at this level; all code lives in subdirectories with their own contracts.

### Child contracts

| Directory | Classification | Contract | What it covers |
|-----------|---------------|----------|----------------|
| [`./scripts/README.md`](./scripts/README.md) | Component Package (Peanut) | Leaf package | Verification gates, seed scripts, database test runners |
| [`./supabase/README.md`](./supabase/README.md) | Repository Root (Hay) | Rolls up archive/, functions/, migrations/ | Edge functions, SQL migrations, seed SQL, config.toml |
| [`./src/README.md`](./src/README.md) | Repository Root (Hay) | Rolls up actions/, app/, components/, hooks/, lib/, providers/, store/, styles/, types/ | Full Next.js application layer |
| [`./docs/README.md`](./docs/README.md) | Documentation index | Rolls up 14 numbered guides, runbooks, planning | Product vision, architecture, data model, security, finance, field ops, admin, deployment, operations, testing, seeding, roadmap, glossary |

### Interface (public symbols at root level)

| Symbol | File | Kind | Notes |
|--------|------|------|-------|
| `pnpm verify` | `package.json:23` | CI verification | typecheck → lint → vitest → all static verify gates (migrations, actions, CTA links, i18n ×3, db-projections, RLS isolation, reliability, licenses) |
| `pnpm build` | `package.json:12` | Production build | Next.js production build with PWA |
| `pnpm test` | `package.json:16` | Unit tests | `vitest run` |
| `pnpm dev` | `package.json:10` | Dev server | `next dev` on http://localhost:3000 |

### Invariants

- Every Server Action is auth-guarded or allowlisted — [`scripts/verify-action-auth.mjs`]
- Every migration enables RLS on tenant tables — [`scripts/verify-rls-isolation.mjs`]
- i18n parity across all 5 locales — [`scripts/verify-i18n.mjs`]
- CTA links resolve under `/public` — [`scripts/verify-cta-links.mjs`]
- Every tenant table has `organization_id`-scoped RLS policy — [`supabase/migrations/`]
- Deno edge functions type-check — [`scripts/verify-functions.mjs`]
- Allowed production licenses only — [`scripts/verify-licenses.mjs`]
- Public site reads only `public_*` views — [`scripts/verify-db-projections.mjs`]

### Side Effects

- `pnpm build` generates `.next/` build output and PWA service worker files
- `npx supabase db push` mutates the database schema (migrations applied in filename order)
- `npx supabase db reset` reapplies all migrations and runs `seed.sql` (inserts default org `AWE e.V.`) — [`supabase/seed.sql:12`]
- Seed runners write to a live Supabase database only with `--confirm` flag — [`scripts/seed-master.mjs`, `scripts/seed-personas.mjs`]
- DB test runners always `ROLLBACK` inside a single transaction — [`scripts/run-rls-tests.mjs`, `scripts/run-runtime-tests.mjs`]

### Verification command

`pnpm verify` — runs `typecheck` → `lint` → `vitest` → all static verify gates
(`verify:migrations`, `verify:actions`, `verify:cta-links`, `verify:i18n`,
`verify:i18n:hardcoded`, `verify:i18n:usage`, `verify:db-projections`,
`verify:rls`, `verify:reliability`, `verify:licenses`). Keep green locally before pushing.
