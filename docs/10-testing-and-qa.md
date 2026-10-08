# 10 — Testing & QA

## Layers

| Layer | Tool | What it proves | Run |
|---|---|---|---|
| Unit | Vitest (`src/**/*.test.ts`, 207 tests) | FX math, CSV escaping, sync classification, offline outbox/memory fallback, permissions matrix, sanitizers, PII seed/app crypto contract | `pnpm test` |
| Static gates | `scripts/verify-*.mjs` | Migrations (ordering/quotes/parity), action auth (302 guarded), CTA routes, i18n parity + no hardcoded strings, RLS isolation (83 tables), reliability invariants, licenses | `pnpm verify:*` |
| Live RLS | `supabase/tests/rls-isolation-tests.sql` via `scripts/run-rls-tests.mjs` | Cross-tenant isolation + role gates against a real DB, transactional rollback | `pnpm test:rls` (needs `DATABASE_URL`) |
| E2E | Playwright (`tests/e2e/`, `playwright.config.ts`) | Auth, donation flow, public pages, translation workflow, accessibility | `pnpm test:e2e` (needs app + DB + browsers) |
| Typecheck/lint | `tsc --noEmit`, eslint 9 | Full-project correctness, hooks purity, no unused vars | `pnpm typecheck`, `pnpm lint` |

Full gate: `pnpm verify` (typegen-less: typecheck → lint → unit → all static
gates), then `pnpm build`. Known pre-existing failure: `verify:cta-links`
flags `/about` in two e2e specs (present at HEAD; unrelated to recent work).

## What must always be tested (regression-critical)

- Money: spent rollups, currency guards, two-step thresholds, allowable-cost
  blocks, allocation exact-sums, grant balances to the cent.
- Permissions: matrix changes (TS + SQL together — the permissions test pins
  member/manager counts so drift fails loudly).
- Sync: ack-only removal, idempotent replay, terminal parking, conflict
  logging, blind-hash stability (`field-crypto-contract.test.ts` pins the
  seed/app byte contract — change KDF/layout/hash on either side in lockstep).
- Privacy: consent-required writes, encryption fail-closed without a key,
  quarantine-until-clean uploads.

## Field Reality Stress Test (release gate — run before every field release)

Requires a staging project + two test phones. Record expected vs actual for
each; release is blocked on all-pass.

| # | Scenario | Procedure | Pass gate |
|---|---|---|---|
| 1 | Week offline | Airplane mode 5 days (or simulated), 200 records across 2 devices, then sync | 100% acknowledged, 0 lost, 0 doubles |
| 2 | Lost/stolen phone | Freeze account mid-queue; inspect other device's queue | No cross-user replay; queue attributable via `belongsToSession` |
| 3 | Concurrent edit | Two officers edit one beneficiary; second saves on stale `base_updated_at` | `sync_conflicts` row, both versions preserved, no silent overwrite |
| 4 | Duplicate registration | Register same household twice (exact + fuzzy variant) | Candidate flagged at entry (online) or at sync (offline); merge path works |
| 5 | Half-failed sync | Kill network mid-batch (2G throttle + drop) | Resume is idempotent: 0 doubles via `offline_uuid`/`idempotency_key` |
| 6 | Donor audit | Export grant trail + CSV with hash from live staging data | Matches ledger to the cent; hash reproduces |
| 7 | Deletion request | Archive + DSAR-status flow on a test beneficiary | Archived immediately; hard-delete path documented as Phase 3 gap |

## Manual QA checklists

- **Field release**: register <2 min/household, 3-tap service log, sync
  screen states, offline fallback page, crash-recovery drafts, RTL layout
  (ar), 5-locale spot-check of new strings.
- **Finance release**: full expense lifecycle incl. threshold crossing with
  two different approvers, grant-term block message, FX add + conversion +
  missing-rate display, reconcile all-zero close, donor 360 totals per
  currency, IATI warnings read correctly.
- **PWA release**: fresh install, one online visit, airplane-mode revisit of
  cached field routes, `/~offline` for uncached routes, no cached admin HTML.
