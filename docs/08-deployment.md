# 08 — Deployment

Reader: engineers, IT. Node ≥ 22.12, pnpm 9. Repo root is the deployable app
(`apps/ngo` in traces = this directory).

## Environments

| Item | Development | Production |
|---|---|---|
| Command | `pnpm dev` (Turbopack, port 3000) | `pnpm build` → `pnpm start` (or Docker, `Dockerfile`) |
| PWA/SW | Disabled in dev | Enabled; field routes runtime-cached, `/~offline` fallback |
| Supabase | Linked cloud project (`.env.local`) or `npx supabase start` (Docker) | Linked cloud project |
| Secrets | `.env.local` (never committed) | Host env / secret manager; see `.env.example` |

`pnpm clean` removes `.next/out/coverage/playwright-report/test-results`
(includes poisoned font artifacts — rerun after font/config changes).

## Environment variables (full list in `.env.example`)

Required: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Server-only: `SUPABASE_SERVICE_ROLE_KEY`.
Production-critical: `ENCRYPTION_KEY` (32+, PII unreadable without it),
`ABUSE_HASH_SALT`, `RECEIPT_HMAC_SECRET` (32+). Optional with honest
degraded modes: `STRIPE_*` (else pledge mode), `TWILIO_*` (webhook 503s
closed without it), `RESEND_*`, captcha/edge/CMS-AI keys, `AI_COPILOT_ENABLED`
(default off), `METRICS_TOKEN` (404s `/api/metrics` when unset),
`NEXT_PUBLIC_PHASE0_FULL_NAV` (operator nav override).

Validate shape any time: `src/lib/env.ts` (zod) fails boot on bad values.

## Database

```bash
npx supabase link --project-ref <ref>   # once
npx supabase db push                    # apply pending migrations (ordered, idempotent)
npx supabase migration list             # confirm Local == Remote
pnpm supabase:gen-types                 # regenerate src/types/database.ts (generated, do not hand-edit)
node scripts/verify-migrations.mjs      # static gate (also in CI)
```

Migrations relevant to recent work: `20260926000001_phase0_finance_truth`
(currency guards, spent rollup, org currency), `20260927000001_phase1_field_core`
(beneficiaries/services/referrals/conflicts + permission matrix),
`20260927000002_phase2_finance_ops` (FX, allocations, approvals, donor link,
snapshot hashes). Never edit an applied file; add a new dated migration.
New tenant tables need `add_tenant_policies()` or `verify-rls-isolation`
fails CI. New permissions need both `permissions.ts` and the SQL matrix.

## Edge functions & cron

Deploy: `npx supabase functions deploy --use-api --yes` (no Docker needed).
Functions: `cron-runner`, `webhook-delivery`, `notification-dispatcher`,
`automation-engine` (verify_jwt=false; `CRON_SECRET` header is the boundary).

```bash
npx supabase secrets set CRON_SECRET=<random-32-bytes>
```

Then once in SQL: `vault.create_secret(...)` + `select public.schedule_cron_jobs()`
(idempotent; skips cleanly without pg_cron/Vault). Cadence: cron-runner +
webhook-delivery every minute; notification-dispatcher + automation-engine
every 5 minutes. Full runbook: `supabase/README.md` (release section).

## Release checklist

1. `pnpm verify` green (typecheck, lint, 207+ unit tests, all static gates).
2. `node scripts/verify-cta-links.mjs` — known pre-existing `/about` hits in
   e2e specs; do not "fix" by editing tests blindly.
3. `pnpm build` green locally (catches prerender/edge issues Turbopack dev
   hides; note Windows standalone-symlink caveat in `next.config.ts`).
4. `npx supabase db push` + `migration list` parity.
5. Deploy app + functions; set/rotate secrets; confirm `/api/health` and
   gated `/api/metrics`.
6. Field smoke: online visit caches `/field`; airplane-mode register → sync.
7. Finance smoke: approve one expense end-to-end; reconcile screen all-zero
   attention lists (or documented).

## Notes & known environment constraints

- This build room has no egress to `fonts.gstatic.com` or `*.supabase.co`
  (DNS fails). Fonts were therefore cut to system stacks (no webfont
  downloads anywhere) and seeding/DB work must run where the database is
  reachable. Do not reintroduce CDN fonts without an offline fallback.
- Playwright e2e (`pnpm test:e2e`) needs browsers + a live app + DB; unit +
  static gates are the CI backbone (see `10-testing-and-qa.md`).
