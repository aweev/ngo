# 02 — Architecture

## Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 App Router, React 19 | `src/app/[locale]/` — public, field, dashboard, admin |
| Data | Supabase Postgres + Auth + Storage | RLS on all tenant tables; service role server-only |
| PWA | `@ducanh2912/next-pwa` | Runtime-cached field routes + `/~offline` fallback |
| i18n | next-intl, en/de/fr/es/ar (ar RTL) | `messages/*.json`; parity + hardcoded-string gates |
| UI | Tailwind 4, shadcn/radix | System font stacks (no webfont downloads) |
| Offline | Hand-rolled IndexedDB (`src/lib/offline/`) | Outbox + drafts + key-value meta, memory fallback |
| Jobs | pg_cron + 4 edge functions | `cron-runner`, `webhook-delivery`, `notification-dispatcher`, `automation-engine` |
| Validation | zod everywhere inputs cross trust boundaries | Actions, intake, env (`src/lib/env.ts`) |

## Request flow

```
Browser (field PWA / admin)
  → proxy.ts (session via getUser, MFA step-up, org gate, i18n)
  → Server Component / Server Action
  → authorizePermission() (base role + custom grants + overrides, fail-closed)
  → Supabase SSR client (RLS-scoped to active org)
  → Postgres (triggers: updated_at, org immutability, spent rollups, currency)
  → audit_events append-only + outbox_events for fan-out
```

Privileged paths (Stripe webhook, WhatsApp intake, receipts, admin storage)
use the single choke point `src/lib/supabase/admin-client.ts`
(`server.ts` re-exports it). Nothing else may hold the service key.

Key files: `src/proxy.ts`, `src/auth.ts`, `src/lib/auth/guards.ts`,
`src/lib/auth/permissions.ts`, `src/lib/supabase/{server,admin-client,middleware}.ts`.

## Module map (`src/`)

| Area | Code | Purpose |
|---|---|---|
| Field app | `app/[locale]/field/`, `components/field/` | Offline-first PWA (Phase 1) |
| Field domain | `actions/{beneficiaries,services,field-sync,field-reports}.ts`, `lib/field-records.ts`, `lib/field-crypto.ts` | Consent + encryption + idempotent writes |
| Offline | `lib/offline/{field-db,sync-engine}.ts`, `store/use-field-sync-store.ts` | IDB outbox, sync orchestration, status |
| Finance | `actions/{financial,fx,reconciliation,trust}.ts` | Budgets, approvals, FX, grants, donor links |
| Reporting | `actions/{reporting,iati}.ts`, `lib/{csv,iati-export,fx}.ts` | Snapshots with hashes, CSV, honest IATI |
| Trust/privacy | `actions/{trust,privacy,documents}.ts`, `lib/{audit-events,consent-records,trust-documents}.ts` | Funds, DSAR scaffolding, quarantine uploads |
| Public site | `app/[locale]/public/`, `actions/public.ts` | Frozen transparency surface via safe views |
| Intake | `app/api/webhooks/whatsapp/`, `supabase/migrations/...field_report_intake.sql` | Quarantined WhatsApp/SMS reports |

## Offline sync protocol (field)

1. **Queue.** Every field write is an op `{kind, offline_uuid, idempotency_key,
   base_updated_at, payload}` in the IndexedDB `outbox` store
   (`enqueueFieldOp`). Drafts autosave per form (`saveDraft`) for crash
   recovery. Photos are never queued (evidence uploads when online).
2. **Push.** `syncNow()` sends FIFO batches (≤25) to `pushFieldBatch`, which
   funnels through `lib/field-records.ts` — the same consent/encryption/
   idempotency path as online writes. Within a batch, household UUIDs resolve
   to server ids so same-trip members link up (`household_offline_uuid`,
   `beneficiary_offline_uuid` substitution).
3. **Acknowledge.** Per-item results: `synced` (created or replay),
   `duplicate` (created + merge notice), `conflict`, `error`. Only
   acknowledged UUIDs leave the outbox; failures increment attempts and park
   after 8 for human review (`isSyncTerminal`).
4. **Pull.** `pullFieldUpdates(since)` returns changed rows + open conflicts;
   edits carry `base_updated_at`, and stale writes are rejected into
   `sync_conflicts` (surfaced, never silently overwritten).
5. **Resolve.** `resolveSyncConflict` applies keep-mine / keep-server / merged
   (merged patches are allowlisted to non-PII operational fields; encrypted
   columns are never patched from a conflict payload).

PWA behavior (`next.config.ts`): `cacheOnFrontEndNav` caches visited field
routes for offline revisits; uncached navigations fall back to
`app/~offline/page.tsx` (self-contained, retry button); `/admin`,
`/dashboard`, `/auth`, `/api` are never served cached HTML.

## Data-protection shape

- PII at rest: `*_encrypted` columns (AES-256-GCM, per-org salt from
  `ENCRYPTION_KEY`); `search_hash` blind indexes for lookup/dedupe.
- Consent: `recordConsent()` (`lib/consent-records.ts`) writes granted rows;
  field writes require one first.
- Uploads: magic-byte sniffing, SVG rejection, EXIF/GPS stripping, SHA-256
  checksums, quarantine (`scan_state='upload'`) until scanned clean.
- Secrets: zod-validated env (`src/lib/env.ts`); abuse-hash salt and PII key
  are independent secrets — the service key is never reused as a salt.

## Finance integrity shape

- `budget_lines.spent_amount` rolls up from approved/paid expenses via
  trigger (`20260926000001`); `approveExpense` stamps `approved_at`.
- Currency guard triggers: linked rows must match line/budget/fund currency;
  unlinked rows must match `organizations.default_currency`.
- Two-step approvals above `expense_approval_threshold`, different approvers,
  allowable-cost checks against linked grants, full trail in
  `expense_approvals`.
- FX through dated `exchange_rates` rows; `getReconciliation()` converts into
  the org currency and lists unrated pairs instead of guessing.
- Reports snapshot rows + `query_hash`; CSV exports share the fetch path.

## Verification gates (CI, `.github/workflows/`)

`pnpm verify` = typecheck + lint + unit tests + `verify:migrations`,
`verify:action-auth` (302 actions guarded), `verify:cta-links`,
`verify:i18n` + `verify:i18n-hardcoded`, `verify:rls-isolation` (83 tables),
`verify:reliability`, `verify:licenses`. See `10-testing-and-qa.md`.
