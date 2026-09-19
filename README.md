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
```

## Architecture map

```
src/
  app/[locale]/public/    Public website (CMS-driven, ISR + tag revalidation)
  app/[locale]/dashboard/ Member dashboard
  app/[locale]/admin/     Admin command center (permission-gated)
  app/api/stripe/webhook/ Donation confirmation (signature-verified, service role)
  actions/                Server Actions — every export passes an auth guard
  lib/auth/               Permission registry + authorize*/require* guards
  lib/supabase/           SSR/route/middleware/public clients
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

- [`docs/production-readiness-notes.md`](./docs/production-readiness-notes.md) — known gaps & release gate
- [`docs/programs-production-plan.md`](./docs/programs-production-plan.md) — programs vertical plan
- [`docs/planning/task.md`](./docs/planning/task.md) — build-wave execution log
- [`MIGRATION-GUIDE.md`](./MIGRATION-GUIDE.md) — Go API → Next.js + Supabase architecture migration

