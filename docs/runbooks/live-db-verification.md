# Runbook — Live Database Verification (P0/P1 gates)

All four follow-up gates were implemented and executed 2026-10-12. Three run
without any database; the live checks below ran green against an ephemeral
Postgres harness and must be re-run against the **real Supabase project**
before release.

## 1. Static gates (no DB, run anywhere)

```bash
node scripts/verify-i18n-usage.mjs     # every t() key exists in en.json (0 gaps)
node scripts/verify-licenses.mjs       # 612 prod packages, 0 violations
node scripts/verify-db-projections.mjs # static mode: views/grants/columns in migration text
```

`verify:db-projections` and `verify:i18n:usage` are in the blocking `pnpm verify`
chain. `verify:licenses` fails loudly (exit 1, no crash) when pnpm cannot see
`pnpm-lock.yaml` — e.g. Windows shells opened on a UNC share, where `cmd.exe`
cannot cwd; run it from WSL/Linux or CI.

## 2. Ephemeral live harness (vanilla Postgres + stubs)

Mirrors `supabase/postgres` platform defaults that the migrations assume
(verified against Supabase docs + `supabase/postgres` init-scripts):

- roles `anon`, `authenticated`, `service_role`
- `ALTER DEFAULT PRIVILEGES … GRANT ALL … TO anon, authenticated, service_role`
- minimal `auth.users` + `auth.uid()` reading `request.jwt.claim.sub`
- minimal `storage.buckets/objects` + `storage.foldername()`

```bash
docker run -d --name ngo-pg-verify -e POSTGRES_PASSWORD=postgres -p 5544:5432 postgres:16-alpine
docker cp supabase/migrations ngo-pg-verify:/migrations
docker cp supabase/tests/live-db-bootstrap.sql ngo-pg-verify:/bootstrap.sql
docker exec ngo-pg-verify psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f /bootstrap.sql
# then apply every file in supabase/migrations/ in filename order with ON_ERROR_STOP=1
```

Result 2026-10-12: **51/51 migrations applied, 0 failures** (incl. P0 gate migration).

## 3. RLS isolation suite (live, transaction-wrapped, rolls back)

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5544/postgres node scripts/run-rls-tests.mjs
# or: psql $DATABASE_URL -f supabase/tests/rls-isolation-tests.sql
```

Result 2026-10-12: **all assertions passed**. The suite was repaired to be
honest — see §5 for what was wrong and why.

## 4. Projections + seeds against live DB

```bash
DATABASE_URL=... node scripts/verify-db-projections.mjs   # static + live catalog
psql $DATABASE_URL -f supabase/seed.sql
psql $DATABASE_URL -f supabase/seed-p0-production-content.sql
```

Result 2026-10-12: **110/110 checks green**, incl. `public_default_org_id()`
resolution, anon grants, runtime RLS, and all P0 webhook/form columns.
Anon smoke reads returned the homepage hero + org profile in all 5 locales
(`public_content_page_translations`, `public_entity_translations`).

## 5. Test repairs made while proving the suite (do not revert)

- `rls-isolation-tests.sql` inserts the 5 impersonated users into
  `auth.users` (FK `fk_org_members_user` requires them; nothing created them).
- Member `workers` read now expects **0** (matrix grants member only
  notifications/messaging/events read — the old `= 1` contradicted it).
- RLS `UPDATE`/`DELETE` denials assert **0 affected rows** via new
  `tests.affected()` helper — silent filtering never raises, so
  `expect_error` was the wrong assertion (kept for `INSERT`, which raises).
  Exception: content publish denial stays `expect_error` — the
  `enforce_content_publish()` trigger genuinely raises.
- Fixed unclosed `org_events` assertion (missing paren/message) + seeded
  published events so the `events.read` allowance is actually exercised.
- Fixed org-immutability test targeting the row's **own** org (no-op typo).

## 6. Browser E2E (needs real project + browsers)

```bash
./node_modules/.bin/playwright install chromium --only-shell  # CDN: cdn.playwright.dev
# or reuse system Chrome/Edge: PLAYWRIGHT_E2E_CHANNEL=chrome|msedge
pnpm test:e2e
```

E2E boots the app itself (see `playwright.config.ts` `webServer`) and needs a
backend with applied migrations + seeds: point `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` at the project (the committed `.env.local`
still holds placeholders). New P0 smoke tests assert `sitemap.xml` (no
orphan `/public/campaigns/` URLs), `robots.txt`, `/api/health`, and the
newsletter confirm page. Browser download was blocked in this sandbox
(cdn.playwright.dev stalls); CI runs the suite with downloaded browsers.
