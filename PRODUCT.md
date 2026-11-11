# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router) + React 19; Supabase (Postgres + Auth + Storage) with RLS multi-tenancy; Stripe Checkout (optional, pledge fallback); Tailwind CSS 4 + shadcn/radix; PWA via `@ducanh2912/next-pwa`; i18n next-intl (en, de, fr, es, ar); zod validation; hand-rolled IndexedDB outbox + sync engine; pg_cron + 4 edge functions.

## Users

Primary user: field officer — works in remote villages on shared low-end Android devices with intermittent signal, needs to register beneficiaries, log services, and sync safely when offline.
Other audiences: program manager, finance officer, fundraiser, M&E officer, executive director / board, volunteer, donor.

## Product Purpose

NGO OS (AWE System) is the single system that lets an organization turn donor money into proven community impact, with full transparency. It serves seven core jobs: manage programs and projects; register and support beneficiaries; collect field data reliably including offline; manage donors, grants, and fundraising; run finance with fund accountability; report impact; coordinate people (staff, volunteers, partners, approvals).

## Positioning

Offline-first field work (IndexedDB outbox, idempotency keys, ack-only removal, visible conflict handling); beneficiary PII as AES-256-GCM ciphertext with blind-index hash lookups and consent-gated reads; fund accountability with restricted vs unrestricted funds, two-step approvals above threshold, dated FX, exact-sum cost splits; immutable append-only audit trails; multi-tenant orgs via RLS; CSV export on every report and IATI XML for institutional donors; no vendor lock-in; runnable by two developers.

## Operating Context

Field officers in remote areas with days-long connectivity gaps, shared devices, low digital literacy; admin command center (`/admin`) for program, finance, fundraising, M&E, and executive roles; member dashboard (`/dashboard`) for volunteers; public transparency site (`/public`) as a frozen minimal surface; Supabase backend with service-role choke point for privileged ops; CI gates (typecheck, lint, typegen, migration checks, action auth guard, CTA link check).

## Capabilities and Constraints

Confirmed functionality: beneficiary/household/service/referral model with consent + PII encryption; IndexedDB outbox + sync protocol + conflict logging; PWA offline fallback; field-report verification queue + promotion path; two-step expense approvals; allowable-cost enforcement; dated FX + exact-sum allocations; reconciliation screen; report builder v2; IATI export; donor 360°; Stripe Checkout with signature-verified webhooks; MFA fail-closed; DSAR erasure scaffolding; role-based permissions (5 roles, no custom role builder).
Constraints: offline-first field work; do no harm (PII encrypted, consent required, soft archival, governed DSAR deletion); fund accountability; immutable audit trails; low digital literacy (large tap targets, icons plus labels, plain language, undo windows, five languages); interoperability (CSV/IATI, no journal entries or payroll); sustainability (two developers, one Next.js app, one Postgres, four edge functions, static CI gates).
Undecided: Swahili/Hausa field locale catalogs pending (en/fr/ar ship today); annual/consolidated donor receipt self-service not yet shipped.

## Brand Commitments

Name: AWE System (NGO OS). Voice: plain, direct, jargon-free. No Google Fonts (system stacks only). No AI-generated donor narratives.

## Evidence on Hand

README.md; docs/01-product-vision.md through docs/14-architecture-decisions.md; docs/production-readiness-notes.md; docs/programs-production-plan.md; docs/MONITORING_OBSERVABILITY.md; docs/PRIVACY_RETENTION_POLICY.md; supabase/migrations/; src/app/[locale]/{public,field,dashboard,admin}; src/actions/; src/lib/; supabase/functions/. No committed visual-regression goldens or screenshot fixtures found.

## Product Principles

1. Offline-first: field registration, service logging, and referrals work without internet and sync safely afterward — zero lost records, zero silent duplicates.
2. Do no harm: beneficiary PII is encrypted at rest, consent-gated, and hard deletion is a governed DSAR flow.
3. Fund accountability: restricted vs unrestricted funds, two-step approvals, exact-sum cost splits, audit-grade reconciliation and IATI.
4. Immutable audit: money, approvals, promotions, exports, and merges all write append-only audit events.
5. Low digital literacy: large tap targets, icons plus labels, plain language, undo windows, honest empty/offline/error states.
6. Interoperability: CSV export on every report, IATI XML, spreadsheet import path — no vendor lock-in.
7. Sustainability: runnable by two developers with static verification gates in CI.

## Accessibility & Inclusion

Five languages (en, de, fr, es, ar including RTL); large tap targets; icons plus labels; plain language; honest offline/error states; system font stacks with zero webfont egress.
