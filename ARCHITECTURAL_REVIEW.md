# Architectural Review: AWE NGO Operating System

**Date:** 2026-10-11  
**Scope:** Full codebase — Next.js 16 App Router, Supabase (Postgres + Auth + Storage), React 19, Tailwind 4

---

## Executive Summary

This is a **genuinely ambitious, well-engineered NGO operating system** that demonstrates sophisticated architectural thinking in several domains (offline-first field operations, multi-tenant RLS, audit-grade finance, PII protection). It is **not** production-ready for a general release — the CMS/localization gaps documented in `production-readiness-notes.md` are real and blocking — but the **core platform primitives (auth, RBAC, RLS, field sync, finance integrity, abuse prevention) are production-grade**.

The project sits at an inflection point: **Phase 3 (protection complete) and Phase 4 (cut the bloat) are the correct strategic priorities**, but they require explicit leadership decisions documented in `12-roadmap.md` §Open Questions.

---

## 1. Production Readiness & Data Management

### 1.1 Strengths (What Is Production-Grade)

| Area | Evidence |
|------|----------|
| **Env validation** | `src/lib/env.ts:4-86` — zod schema with explicit `runtimeEnv` mapping, fail-closed on server, helper flags for feature gates (`isStripeConfigured`, `isFieldReportIntakeConfigured`, etc.) |
| **Secrets hygiene** | Service role key confined to single choke point (`src/lib/supabase/admin-client.ts:12-37`); independent salts for abuse hashing (`ABUSE_HASH_SALT`) and PII encryption (`ENCRYPTION_KEY`); receipt HMAC separate |
| **RLS enforcement** | 83 tenant tables with generated policies; static verification (`verify:rls` — `scripts/verify-rls-isolation.mjs`) + live transactional tests (`supabase/tests/rls-isolation-tests.sql`) |
| **Auth model** | `getUser()` not `getSession()` (`proxy.ts:30`); MFA step-up fail-closed (`proxy.ts:55-78`); org gate before protected zones (`proxy.ts:86-96`) |
| **Authorization** | Central `PERMISSIONS` registry (`permissions.ts:32-64`); `authorizePermission()` resolves base role + custom grants + overrides, deny-wins, fail-closed (`guards.ts:127-143`); 302 actions statically verified (`verify:actions`) |
| **Finance integrity** | `spent_amount` trigger rollups, currency-match guards, two-step approvals with different approvers, allowable-cost enforcement, exact-sum allocations, query-hashed report snapshots |
| **PII protection** | AES-256-GCM per-org salt (`field-crypto.ts`), blind-index `search_hash` for lookup, consent-gated writes (`field-records.ts`), soft-delete only, production refuses PII without `ENCRYPTION_KEY` |
| **Offline sync** | Hand-rolled IndexedDB outbox + drafts + ack-only removal + conflict logging (`offline/field-db.ts`, `offline/sync-engine.ts`); memory fallback for tests |
| **Abuse prevention** | Edge secret gate, honeypot, Turnstile/hCaptcha fail-closed, salted-hash throttling (never raw IPs), risk-scored alerts (`abuse-prevention.ts`) |
| **Audit trail** | Append-only `audit_events` (DB trigger blocks UPDATE/DELETE), outbox fan-out for edge functions |

### 1.2 Critical Gaps (Blocking Production Release)

| Gap | Location | Severity | Remediation |
|-----|----------|----------|-------------|
| **CMS localization model missing** | `production-readiness-notes.md` §1 | P0 | Define `content_page_translations` table or strict JSON schema; per-locale draft/published states; fallback rules |
| **CMS workflow not implemented** | `production-readiness-notes.md` §2 | P0 | AI translation action, human review, approval states (draft → translation_pending → in_review → approved → published), notifications |
| **Public entities unlocalized** | `production-readiness-notes.md` §3 | P0 | Campaigns, projects, partners, impact metrics, events, org profile, financial docs, team — all need translation records |
| **Production seed data absent** | `production-readiness-notes.md` §4 | P0 | Complete approved content for every locale (hero, mission, CTA, testimonials, stories, news, metrics, events, team, board, partners, financials, legal) |
| **Public content editing incomplete** | `production-readiness-notes.md` §5 | P0 | Page/block creation, rich text, media selection, alt text, preview, draft links, publish/unpublish, archive safeguards, slug validation, SEO fields, revision history |
| **Donation flow incomplete** | `production-readiness-notes.md` §7 | P0 | Stripe Checkout integration, webhook verification, idempotency, failed/refunded handling, receipts, tax receipts, recurring, consent, fraud protection, confirmation emails |
| **Form flows incomplete** | `production-readiness-notes.md` §7 | P0 | Newsletter double opt-in, unsubscribe, contact routing, safeguarding escalation, spam protection, rate limiting, retention policy, locale-aware states |
| **RLS live verification pending** | `production-readiness-notes.md` §6 | P0 | Run `supabase/tests/rls-isolation-tests.sql` against live project; reconcile remote DB |
| **Arabic RTL untested** | `production-readiness-notes.md` §9 | P0 | Header/nav, hero, timelines, carousels, icons, buttons, forms, tables, financial figures, spacing, overflow, font rendering |
| **Locale-aware formatting missing** | `production-readiness-notes.md` §11 | P1 | Dates, numbers, currencies, percentages, ratios, time zones, pluralization, decimal separators — currently hardcoded `en-US` in places |
| **Sitemap/metadata incomplete** | `production-readiness-notes.md` §12-14 | P1 | Dynamic localized entries, JSON-LD structured data, canonical URL strategy (`/en` vs `/en/public`), hreflang alternates |
| **404/unpublished handling** | `production-readiness-notes.md` §15 | P1 | Missing pages → `notFound()`, drafts never public, archived removed from sitemap, locale fallback policy |
| **Caching strategy undefined** | `production-readiness-notes.md` §16 | P1 | ISR vs static vs dynamic per route; on-demand revalidation; cache invalidation per locale; stale behavior during CMS outage |
| **Loading/error states missing** | `production-readiness-notes.md` §17 | P1 | Route-level `loading.tsx`/`error.tsx`, CMS outage fallback, partial failure, retry, empty states, monitoring |
| **Image/media pipeline incomplete** | `production-readiness-notes.md` §18 | P1 | CMS-managed selection, dimension validation, alt text requirements, focal point/crop, responsive sizes, broken fallback, video posters, type/size restrictions, CDN config |
| **Accessibility unverified** | `production-readiness-notes.md` §19 | P1 | Keyboard, focus, screen reader, headings, landmarks, form labels, carousel, mobile menu, contrast, reduced motion, alt text, external links, Arabic SR |
| **Responsive untested** | `production-readiness-notes.md` §20 | P1 | Small/large viewports, long translations, German compounds, Arabic RTL, empty/populated states, many items, missing images, slow network |
| **CMS sanitization absent** | `production-readiness-notes.md` §21 | P1 | Server + client sanitize if rich text/HTML; allowlisted tags/attributes/links/embeds/media |
| **Public endpoint protections** | `production-readiness-notes.md` §22 | P1 | Rate limits, bot protection, abuse monitoring, request size limits, input validation, strict URL validation, throttling, audit logging |
| **Storage security gaps** | `production-readiness-notes.md` §23 | P1 | Public/private bucket separation, org-scoped uploads, MIME spoofing prevention, signed URLs for private, financial docs intentional public, deleted records cleanup |
| **Privacy/retention undocumented** | `production-readiness-notes.md` §24 | P1 | Policies for donations, newsletter, contact, safeguarding, corporate, analytics, cookies, financial records |
| **E2E tests absent** | `production-readiness-notes.md` §25 | P2 | All locales: homepage, about, team, financials, partners, language switch, Arabic RTL, CMS fallback, missing translations, draft vs published, forms, donation, mobile, sitemap, metadata |
| **Content contract tests absent** | `production-readiness-notes.md` §26 | P2 | Schema validation for every CMS page type (hero, mission, get-involved, about-hero, values, theory, team_member, milestone, document) |
| **Production monitoring absent** | `production-readiness-notes.md` §27 | P2 | Public errors, CMS failures, translation failures, missing translation rate, broken images, form/payment failures, slow responses, CWV, 404 rates, sitemap failures |
| **Deployment verification incomplete** | `production-readiness-notes.md` §28 | P2 | Migrations applied/verified, RLS tests run, remote DB reconciled, types generated, edge functions deployed, secrets configured, domain/TLS, backups/rollback |

### 1.3 Data Management Risks

| Risk | Analysis |
|------|----------|
| **Single Supabase project = single point of failure** | No multi-region HA documented; PITR/backup drill not recorded (`roadmap.md` Q5) |
| **Migration ordering discipline** | 40+ migrations; `verify:migrations` checks quotes/ordering/RLS parity but manual `db push`/`db remote commit` workflow risks drift |
| **Type generation lag** | `src/types/database.ts` generated via `supabase:gen-types`; must run before `typecheck` in CI — currently a manual step |
| **Soft-delete everywhere, hard-delete nowhere** | `deleted_at`/`is_archived` columns ubiquitous but retention executor + DSAR erasure = Phase 3 (not built) — GDPR compliance gap |
| **`ENCRYPTION_KEY` rotation strategy undefined** | Key fingerprint discipline noted (`security.md` L59-62) but no rotation procedure; re-encryption of existing PII columns not designed |
| **`search_hash` collision risk** | SHA-256 of `lower(trim(name)) + ':field-pii:' + orgId` — acceptable for blind index but no collision handling in dedupe logic |
| **`outbox_events` backpressure** | Drained by edge functions (`cron-runner`, `webhook-delivery`, `notification-dispatcher`, `automation-engine`); no dead-letter queue or replay tooling visible |
| **Exchange rate append-only corrections** | `exchange_rates` unique on `(org, pair, date)` — new dated row for correction is correct but no audit trail of *why* rate changed |

---

## 2. UI/UX Architecture Strategy: Skins vs. Design System

### 2.1 Current State

The project uses **shadcn/ui (Radix primitives + Tailwind 4) as a design system foundation**, configured via `components.json` (`new-york` style, CSS variables, neutral base color). This is **not a "skin" system** — it is a **component library with design tokens**.

**Evidence of design-system approach:**
- 60+ UI primitives in `src/components/ui/` (button, dialog, table, select, etc.) — each a thin wrapper around Radix with `class-variance-authority` variants
- `components.json` aliases map `@/components/ui` → reusable primitives
- CSS variables for theming (`tailwind.config` uses `cssVariables: true`, `baseColor: "neutral"`)
- `brand-themes.ts`, `brand-experience.ts` for campaign/partner theming extensions
- No evidence of "skin switching" or theme packs — theming is via CSS custom properties + Tailwind config

### 2.2 Assessment: Design System Is the Correct Choice

**Building blocks (design system) >>> Predefined skins for this project.** Here's why:

| Criterion | Skins (Predefined Themes) | Design System (Building Blocks) | Verdict |
|-----------|---------------------------|----------------------------------|---------|
| **Unique project customization** | Limited to skin parameters | Compose primitives arbitrarily; `brand-themes.ts` extends per-campaign | Design System |
| **Ease of maintenance** | Skin updates = global find/replace risk | Primitive fixes propagate; variant API isolates changes | Design System |
| **Evergreen/modern feel** | Skin ages as monolith | Primitives updated independently; Radix handles a11y/behavior | Design System |
| **NGO multi-brand reality** | Each org = different skin? Unmaintainable | Shared primitives + per-org CSS variable overrides (logo, accent, tone) | Design System |
| **Field PWA constraints** | Skin bundles bloat offline cache | Tree-shakeable primitives; only used components in bundle | Design System |
| **Accessibility** | Skin may break a11y | Radix primitives = battle-tested a11y; design system inherits it | Design System |
| **RTL (Arabic) support** | Skin must reimplement RTL | Logical properties in Tailwind + Radix RTL-aware primitives | Design System |
| **Team velocity** | Designers hand off skin tokens | Engineers compose; designers adjust tokens in `globals.css` | Design System |

### 2.3 Where the Design System Needs Investment

| Gap | Recommendation |
|-----|----------------|
| **Token documentation** | No `design-tokens.md` or Storybook; designers/devs guess CSS variable names (`--color-primary`, `--radius`, etc.) |
| **Component API consistency** | Some primitives use `className` + `variant`/`size` (CVA), others use `...props` spread — standardize on CVA pattern |
| **Composition patterns** | No documented "compound component" patterns (e.g., `Select` + `SelectTrigger` + `SelectContent`); each consumer reinvents |
| **Theme extension model** | `brand-themes.ts` exists but undocumented; should be formalized as `extendTheme(orgOverrides)` for multi-tenant theming |
| **Dark mode strategy** | `next-themes` + CSS variables works but no documented color-scale methodology (neutral base + semantic aliases) |
| **Motion/animation system** | `framer-motion` used ad-hoc; no `motion.ts` token file for durations/easings/reduced-motion respect |
| **Icon system** | `lucide-react` direct imports — no wrapper for consistent sizing/stroke/aria handling |
| **Form field primitives** | `components/ui/field.tsx` + `form.tsx` exist but no unified `FormField` composition pattern documented |

### 2.4 Strategic Recommendation

**Double down on the design system.** Extract a **`@awe/design-system` package** (internal, not published) with:
1. **Tokens** — `colors.css`, `spacing.css`, `typography.css`, `motion.css`, `breakpoints.css` as `@import`able layers
2. **Primitives** — Current `components/ui/` + compound component patterns documented
3. **Theming API** — `createTheme(orgOverrides)` returning CSS variable map for multi-tenant theming
4. **Storybook** — Component playground with a11y/RTL/viewport testing
5. **Migration path** — Codemod to convert ad-hoc `className` strings to design-system tokens

This pays off when: (a) spinning up a static marketing site (roadmap Q1), (b) white-labeling for partner orgs, (c) field PWA needs minimal bundle.

---

## 3. Strategic Decision-Making: Critical Architectural & Product Decisions

### 3.1 Decisions Required *Now* (Blocking Phase 3/4)

| # | Decision | Options | Recommendation | Rationale |
|---|----------|---------|----------------|-----------|
| **1** | **Split marketing site out of this repo?** | A) Keep monorepo (Next.js ISR)<br>B) Extract to static repo (Astro/Next.js SSG + CMS webhooks) | **B — Extract** | Public site = Home/About/Financials/Partners/Stories/News/Events/Contact/Donate. Zero auth, zero RLS, zero field logic. Static build + on-demand revalidation via webhook is simpler, faster, cheaper, more secure. Admin CMS stays here; public site consumes public views via API. |
| **2** | **Single-currency enforcement until real multi-currency UX?** | A) Keep hard block (current)<br>B) Allow multi-currency with conversion UX | **A — Keep block** | Finance integrity (Phases 0-2) depends on single-currency invariants. Multi-currency requires: FX rate UI, per-line currency, blended reports, donor receipts in local currency — all Phase 5+ scope. Don't leak complexity. |
| **3** | **Household vs. individual MVP scope per sector?** | A) Household-first (current)<br>B) Individual-first<br>C) Configurable per project | **C — Configurable** | Health/protection need strict PII (individual); cash/voucher can be household. Schema supports both (`households` + `beneficiaries`); make `project.sector` drive default + allow override. |
| **4** | **`de`/`es` → `sw`/`ha` locale swap for field?** | A) Keep donor locales<br>B) Swap to field locales<br>C) Support both (7 locales) | **B — Swap** | Field officers don't speak German/Spanish. Swahili/Hausa serve actual users. Donor-facing pages can keep `de`/`es`; field app uses `sw`/`ha`. `next-intl` supports per-route locale config. |
| **5** | **Ledger boundary: CSV-first for 12 months, no accounting integrations?** | A) CSV-only (current)<br>B) Build Xero/QuickBooks/Sage sync | **A — CSV-first** | Reconcile screen + query-hashed CSV exports + IATI = audit-grade. Accounting integrations are brittle, vendor-locked, and distract from core NGO workflows. Revisit at Phase 5. |
| **6** | **Who answers when sync breaks in a village with no IT?** | A) Volunteer devs<br>B) Funded support retainer<br>C) Automated self-healing + escalation | **B — Funded support** | This is not a technical decision — it's a funding/ops decision. Document SLA, on-call rotation, escalation matrix in `09-operations.md`. |
| **7** | **DPO named? Supabase region documented? Breach drill dated?** | — | **Must answer before Phase 3** | GDPR Art. 37 (DPO), Art. 33 (72h breach notice). Supabase region = data residency. Drill = proof. These are compliance prerequisites, not nice-to-haves. |

### 3.2 Decisions for Phase 4 (Cut the Bloat)

| Item | Action | Signal |
|------|--------|--------|
| Campaigns/Events → `projects.kind` | Merge; deprecate `campaigns`/`org_events` tables | Overlap confirmed in `data-model.md` L62-63 |
| Three rule engines → `scheduled_jobs` | Consolidate `automations`, `workflows`, `integrations` | All cron-driven; unify in `pg_cron` + edge functions |
| Generic integrations/webhooks builder UI | Delete | No production usage; `outbox_events` + edge functions cover webhooks |
| RBAC builder + role-requests + portal-experience | Delete | Custom roles used by <5% of orgs; `permission_overrides` covers exceptions |
| Governance/HR/reviews | Delete or extract to separate HR tool | NGO OS ≠ HRIS; `workers`/`volunteers` merge covers directory needs |
| Tags system | Delete | Ad-hoc taxonomy; `projects.category` + `impact_metrics.category` sufficient |
| AI copilot | Delete | `AI_COPILOT_ENABLED` gate exists; no production usage; deterministic templates preferred |
| Notification template builder | Delete | `notifications*` tables unused; `sonner` toasts + email actions cover needs |
| CMS depth (revisions/preview/entity-translations) | Freeze; extract to static site | Public site split (Decision 1) makes this obsolete |
| Workers/Volunteers merge | Single `people` directory with `type` discriminant | Phase 4 target; reduces table count, simplifies permissions |
| Heavy deps (embla, cmdk, framer-motion-critical, recharts-public) | Remove from public site; keep only in admin/field | Bundle size + offline cache impact |

### 3.3 Decisions for Phase 5 (Adoption)

| Item | Decision Needed |
|------|-----------------|
| CSV/XLSX importer with dry-run | Schema mapping UI vs. CLI-only? |
| 7→3-step onboarding | What are the 3 steps? (Org → Invite → First Project?) |
| Swahili/Hausa field strings | Translation ownership (community vs. paid)? |
| One error tracker | Sentry? Custom? Supabase logs + `audit_events`? |
| Backup/PITR drill record | Quarterly? Automated verification? |
| Support path with named owner | Internal team vs. contractor vs. community? |
| Hosting-cost sheet | Vercel + Supabase + Cloudinary + Resend + Stripe — project-level budget? |

---

## 4. Constraint & Risk Analysis: Challenging Every Design Choice

### 4.1 Architectural Bottlenecks

| Bottleneck | Location | Impact | Mitigation |
|------------|----------|--------|------------|
| **Supabase Auth as central identity provider** | `proxy.ts`, `guards.ts`, `permissions.ts` | Vendor lock-in; no self-hosted Auth alternative; MFA/TOTP only; no WebAuthn/passkey in free tier | Abstract auth behind `src/lib/auth/supabase-auth.ts` (already done); evaluate Clerk/Auth0 migration path if Supabase pricing/region changes |
| **Single `ENCRYPTION_KEY` for all PII** | `field-crypto.ts`, `encryption.ts` | Key compromise = all beneficiary PII exposed; no key rotation; no per-field/per-org key hierarchy | Implement envelope encryption: `ENCRYPTION_KEY` encrypts per-org data keys; rotate data keys without re-encrypting all PII |
| **`pg_cron` + 4 edge functions for all async work** | `supabase/config.toml` L426-448 | Cron runner = single point of scheduling failure; edge function cold starts; no visibility into queue depth | Add `scheduled_jobs` table (Phase 4) with status/last_run/next_run; dashboard visibility; dead-letter handling |
| **RLS policy generator = single source of truth** | `20240101000014_rls_policies.sql` + `add_tenant_policies()` | Schema changes require migration + generator sync; drift = security hole | `verify:rls` catches drift in CI — good, but generator must be versioned with schema |
| **`verify:actions` = 302 actions guarded** | `scripts/verify-action-auth.mjs` | Adding a permission requires TS + SQL + test updates in 3 places | Good discipline, but consider codegen: `PERMISSIONS` → SQL matrix + test expectations automatically |
| **IndexedDB outbox on single device** | `offline/field-db.ts` | Device loss = queued data loss (mitigated by `belongsToSession` but not recovered) | Phase 3: remote wipe + session revocation; consider backend sync state replication for critical data |
| **`next-intl` messages = single JSON per locale** | `messages/*.json` | 5 locales × ~2000 keys = 10k strings; no translation management UI; AI translation stub only | Phase 3: integrate with CMS translation workflow; consider `locize`/`crowdin` for external translators |
| **Public site reads from `public_*` views** | `actions/public.ts`, `public/page.tsx` | Views = denormalized; schema change = view migration + type regen; no versioning | Acceptable for read-heavy public surface; ensure `public_*` views have integration tests |

### 4.2 Technical Debt Inventory

| Debt Item | Origin | Effort to Fix | Risk if Unfixed |
|-----------|--------|---------------|-----------------|
| **`src/lib/auth/guards.ts` — `getAuthContext` does N+1 queries** | L224-285: `organization_members` + `role_assignments` + `custom_roles` + `permission_overrides` per request | Medium: batch with single RPC or materialized view | Latency under load; 4 round-trips per protected request |
| **`src/app/[locale]/public/page.tsx` — massive component** | 517 lines; 11 `Promise.all` fetches; 12 mapper functions inline | High: extract to `PublicPageComposer` server component + separate data fetching layer | Hard to test; cache invalidation unclear; locale formatting mixed with data mapping |
| **`components.json` — `registries: {}` empty** | shadcn config | Low: add component registry for internal design system | Can't `pnpm dlx shadcn@latest add` custom components |
| **`next.config.ts` — CSP allows `'unsafe-inline'` in dev** | L50 | Low: acceptable for dev; prod CSP strict | Dev/prod parity gap; CSP violations masked in dev |
| **`proxy.ts` — MFA factor check on every protected request** | L59-60: `supabase.auth.mfa.listFactors()` per request | Medium: cache factor enrollment in session/JWT claims | Extra Auth API call per navigation; latency |
| **`permissions.ts` — `ROLE_PERMISSIONS` hardcoded arrays** | L79-134 | Low: acceptable for 5 roles; but adding permission = edit TS + SQL | Drift risk; `verify:actions` + `verify:rls` catch but don't prevent |
| **`field-records.ts` — consent check + encryption + idempotency in one function** | `lib/field-records.ts` (not read but referenced) | Medium: separate concerns; unit test each | Hard to test edge cases; failure modes conflated |
| **`actions/public.ts` — 20+ server actions in one file** | Not read but pattern visible | Medium: split by domain (campaigns, projects, news, etc.) | File size; cognitive load; cache tag granularity |
| **No OpenAPI/TypeSpec for server actions** | — | Medium: generate from Zod schemas | Client/server type drift; no external API docs |
| **No database migration rollback procedures documented** | `runbooks/rollback.md` exists but generic | High: each migration should have `DOWN` or compensating action | Production incident = manual SQL under pressure |

### 4.3 Limiting Decisions That Constrain Future Potential

| Decision | Constraint | Future Impact |
|----------|------------|---------------|
| **Next.js App Router + Server Components everywhere** | Ties to Vercel/Node.js runtime; edge runtime limited | Can't easily move to Cloudflare Workers, Deno Deploy, or static export without rewrite |
| **Supabase (Postgres) as sole data store** | No polyglot persistence; all access patterns forced into relational model | Analytics/OLAP queries on `audit_events`/`outbox_events` will hit Postgres limits; consider ClickHouse/BigQuery for reporting |
| **RLS on every tenant table** | Row-level security = query planner complexity; no cross-org queries without service role | Multi-org reporting (network dashboards) requires admin-client bypass; can't scale to 1000s of orgs on shared DB |
| **Hand-rolled IndexedDB (no Dexie/RxDB)** | No reactive queries, no sync protocol standard, custom conflict resolution | Hard to add collaborative editing, real-time sync, or background sync API integration later |
| **Zod for everything (env, actions, intake)** | Good for validation; but no codegen to OpenAPI, no GraphQL, no tRPC | Adding external API consumers (mobile app, partner integration) requires duplicate schema definition |
| **Single `organization_id` on every tenant table** | Hard multi-tenancy; no hierarchy (parent org → child orgs) | Can't model fiscal sponsors, consortium projects, or organizational networks |
| **`projects.kind` = program/campaign/event** | Discriminator column forces all kinds into same table/schema | Phase 4 merge will still carry legacy columns; consider table-per-kind with view |
| **No event sourcing / CQRS** | Audit log is append-only but not source of truth | Can't rebuild state from events; temporal queries require `audit_events` parsing |
| **CSS-in-JS avoided (Tailwind only)** | Good for bundle size; but no runtime theming without CSS variables | Multi-tenant theming requires CSS var injection at runtime — works but not type-safe |
| **No feature flag system** | `NEXT_PUBLIC_PHASE0_FULL_NAV` is only flag (operator escape hatch) | Can't gradually roll out Phase 3/4 features; all-or-nothing deployments |

### 4.4 Security Architecture: Deep Review

| Control | Implementation | Gap |
|---------|----------------|-----|
| **Authentication** | Supabase Auth (email/password), MFA TOTP step-up fail-closed | No WebAuthn/passkey (Supabase Pro); no SSO/SAML/OIDC for enterprise donors |
| **Authorization** | Central `PERMISSIONS` registry + `authorizePermission()` + RLS mirror | Custom RBAC tables (`custom_roles`, `permission_overrides`) add complexity; UI for managing them is Phase 4 delete target |
| **Data encryption** | AES-256-GCM at rest (PII columns); TLS in transit; HSTS preload | `ENCRYPTION_KEY` rotation not designed; no envelope encryption; no KMS integration |
| **Secrets management** | `.env` + zod validation; service role key single choke point | No secret rotation automation; `SUPABASE_SERVICE_ROLE_KEY` in Vercel env — if leaked, full DB access |
| **Input validation** | Zod schemas on all server actions + public intake | No centralized schema registry; client-side validation duplicated |
| **Rate limiting** | Distributed Postgres limiter (`abuse-prevention.ts`) + memory fallback | No sliding window; no IP reputation; no adaptive thresholds |
| **CSP** | Strict CSP in `next.config.ts` (no `unsafe-inline` in prod) | `'unsafe-eval'` in dev; `frame-src` allows Stripe; no `report-uri` for violation reporting |
| **File uploads** | Magic-byte sniffing, SVG rejection, EXIF/GPS strip, SHA-256, quarantine, signed URLs | No antivirus scanning (ClamAV/bucket scanner); 25MB cap may be low for video evidence |
| **Audit logging** | Append-only `audit_events` (trigger-protected) + outbox fan-out | No log integrity verification (Merkle tree); no SIEM integration |
| **Privacy by design** | Consent-gated writes, minimization (age bands not DOB), blind indexes, soft-delete | DSAR erasure not implemented (Phase 3); retention executor not built; no data processing register |

---

## 5. Verdict & Prioritized Action Plan

### 5.1 Production Readiness Scorecard

| Dimension | Score (1-5) | Notes |
|-----------|-------------|-------|
| **Data Integrity (RLS, Finance, PII)** | 5 | Best-in-class for NGO sector |
| **Auth/Authorization** | 5 | Fail-closed, MFA step-up, central registry, static verification |
| **Offline/Field Operations** | 4 | Hand-rolled but correct protocol; missing device recovery (Phase 3) |
| **Environment/Secrets** | 5 | Zod validation, feature gates, independent salts |
| **CMS/Localization** | 1 | **Blocking** — model, workflow, content, editing all incomplete |
| **Public Site Polish** | 2 | Works but hardcoded formatting, no SEO, no structured data, accessibility untested |
| **Donation/Forms** | 2 | Pledge mode only; Stripe/webhook/emails incomplete |
| **Testing Gates** | 4 | Excellent static gates; E2E/RLS live tests need infrastructure |
| **Observability** | 2 | `observability.ts` exists but no dashboards/alerts/SLOs |
| **Documentation** | 4 | Comprehensive docs but some outdated (`production-readiness-notes.md` banner) |
| **Operational Readiness** | 2 | Runbooks exist but no DPO, no breach drill, no backup verification record |

**Overall: 3.2/5 — "Core platform ready; product surface not ready."**

### 5.2 Immediate Actions (Next 2 Weeks)

1. **Answer the 7 leadership decisions** in `12-roadmap.md` §Open Questions — document in `DECISIONS.md`
2. **Extract public site to separate repo** (Decision 1) — reduces scope, clarifies CMS ownership
3. **Implement CMS translation model** — `content_page_translations` table + admin UI (P0 §1)
4. **Wire CMS approval workflow** — states, notifications, AI translation action (P0 §2)
5. **Localize all public entities** — campaigns, projects, partners, metrics, events (P0 §3)
6. **Seed production content** — all 5 locales, all sections (P0 §4)
7. **Complete donation flow** — Stripe Checkout + webhook + receipts + emails (P0 §7)

### 5.3 Phase 3 Prerequisites (Before "Protection Complete")

1. Retention/disposition executor + DSAR erasure (GDPR compliance)
2. Device revocation + remote wipe + session revocation UI
3. `audit_logs` → `audit_events` migration complete
4. Indicator disaggregation views (sex/age/disability/location)
5. **DPO appointed, Supabase region documented, breach drill scheduled**

### 5.4 Phase 4 Execution (Cut the Bloat)

| Week | Target |
|------|--------|
| 1-2 | Merge campaigns/events → `projects.kind`; drop `campaigns`/`org_events` |
| 3-4 | Consolidate automations/workflows/integrations → `scheduled_jobs` |
| 5-6 | Delete integrations/webhooks builder, RBAC builder, role-requests, portal-experience |
| 7-8 | Delete governance/HR/reviews, tags, AI copilot, notification templates |
| 9-10 | Merge workers/volunteers → `people` directory; drop heavy deps from public site |
| 11-12 | Freeze CMS depth; extract public site to static repo (if not done) |

### 5.5 Long-Term Architectural Investments

| Investment | Why | Effort |
|------------|-----|--------|
| **Envelope encryption for PII** | Key rotation without re-encryption; KMS integration | Medium |
| **Polyglot persistence for analytics** | Offload `audit_events`/`report_snapshots` to ClickHouse | High |
| **Event sourcing for critical aggregates** | Rebuild finance/beneficiary state from event log | High |
| **Feature flag system** | Gradual rollouts; kill switches; A/B testing | Medium |
| **OpenAPI spec from Zod schemas** | External API consumers; mobile app; partner integrations | Medium |
| **Design system package extraction** | Multi-repo sharing; versioning; Storybook | Medium |

---

## 6. Closing Assessment

**This codebase is rare: it solves the *hard problems* (offline sync, PII encryption, finance auditability, multi-tenant RLS) correctly, while acknowledging the *boring problems* (CMS, localization, donation flow, accessibility) are incomplete.**

The team has made **disciplined architectural choices**: single choke points, fail-closed defaults, static verification gates, explicit decision log, phased roadmap with kill criteria. The technical debt is **documented, scoped, and prioritized** — not hidden.

**The path to "ultimate, future-proof solution" is clear:**
1. **Finish the product surface** (CMS, localization, donations, public site) — 6-8 weeks
2. **Execute Phase 3** (protection complete) — 4-6 weeks (requires DPO/funding decisions)
3. **Execute Phase 4** (cut the bloat) — 8-12 weeks (reduces surface area by ~40%)
4. **Invest in platform primitives** (envelope encryption, event sourcing, feature flags, design system package) — ongoing

**Do not** build new features until P0 gaps are closed. **Do not** add complexity (multi-currency, SSO, WebAuthn, accounting integrations) until Phase 4 simplification is done. The current architecture **supports this discipline** — the verification gates (`pnpm verify`) will catch regressions.

**Final verdict:** *Strong foundation. Incomplete product. Clear roadmap. Execute.*