# 12 — Roadmap

## Shipped (Phases 0–2)

- **Phase 0 — stop the bleeding**: grant-balance truth rewrite, `approved_at`
  + `spent_amount` triggers, single-currency guards, budget-status approval
  gate, MFA fail-closed, independent abuse salt, unified upload pipeline,
  service-role choke point, 9-section nav freeze, 14 pre-existing typecheck
  errors fixed.
- **Phase 1 — field core**: beneficiary/household/service/referral model with
  consent + AES-GCM PII + blind hashes, IndexedDB outbox + sync protocol +
  conflict logging, PWA offline fallback, `/field` app (5 destinations),
  dedupe + merge, field-report verification queue + promotion path.
- **Phase 2 — money you can audit**: two-step approvals, allowable-cost
  enforcement, decision trails, dated FX + exact-sum allocations, reconcile
  screen, report builder v2 (filters, pagination, query hashes, CSV), honest
  IATI, donor 360°, master seed.
- **Hardening**: Google Fonts cut to system stacks (offline builds), hero/nav
  desktop collision fixed, expense approval UX for both steps, unused-import
  cleanup.

## Next — Phase 3: protection complete (safety above all)

1. Retention/disposition executor (delete/anonymize/review jobs honoring
   legal holds) + real DSAR erasure path with SLA tracking.
2. Device revocation + remote wipe + session revocation UI.
3. `audit_logs` fully retired onto `audit_events` (dual-write removed).
4. Indicator disaggregation views (sex/age/disability/location rollups).
5. Indirect-cost auto-suggestion from `indirect_cost_rate` in allocations.

## Later — Phase 4: cut the bloat (each item: export → flag-hide → drop)

Merge campaigns/events into `projects.kind`; collapse the three rule engines
into `scheduled_jobs`; delete the generic integrations/webhooks builder UI,
RBAC builder + role-requests + portal-experience, governance/HR/reviews,
tags, AI copilot, notification template builder, CMS depth
(revisions/preview/entity-translations); merge workers/volunteers into one
directory; drop embla/cmdk/framer-motion-critical-paths/recharts-public;
**public site extracted to `apps/web-public` (static repo) — see `PUBLIC_SITE_EXTRACTION_PLAN.md`**.

## Later — Phase 5: adoption

CSV/XLSX importer with dry-run, 7→3-step onboarding, **Swahili/Hausa field strings implemented** (decided: field app locales en/sw/ha/fr/ar), one error tracker, backup/PITR drill record, support path with named owner, hosting-cost sheet.

## Open questions for leadership (decisions required)

*All resolved 2026-10-11 — see Decision Log above.*

## Decision log (append, never rewrite)

| Date | Decision | Rationale |
|---|---|---|
| Phase 0 | Fabricated grant-report fields deleted, not "fixed" | A lying report is worse than an empty one |
| Phase 0 | MFA fail-closed over fail-open | Enrolled users must never silently downgrade to AAL1 |
| Phase 1 | Hand-rolled IndexedDB, no Dexie dependency | One less dependency for a two-dev team; memory fallback keeps it testable |
| Phase 1 | Duplicates flagged, never auto-merged | Merge is a human safeguarding decision |
| Phase 2 | Unmapped IATI nodes omitted with warnings | Invented sectors/funders are audit fraud |
| Fonts | System stacks, Google Fonts removed | Build/dev/field must all work with zero egress |
| 2026-10-11 | Split public marketing site to separate repo (`apps/web-public`) | Zero shared runtime logic with NGO OS; deployment/bundle/security isolation; static SSG + ISR via webhook revalidation |
| 2026-10-11 | Single-currency hard block until Phase 6+ | Finance integrity invariants (spent rollups, approvals, IATI) depend on single-currency guarantees; multi-currency = Phase 6 scope |
| 2026-10-11 | Registration mode configurable per project (`project.registration_mode`) | Schema supports both household/individual; sector drives default (health/protection → individual; cash/voucher → household) |
| 2026-10-11 | Field app locales: en/sw/ha/fr/ar (donor-facing: en/de/fr/es/ar) | Disjoint audiences — field officers need Swahili/Hausa; donors need German/Spanish; `next-intl` per-route config supports this |
| 2026-10-11 | CSV-first ledger for 12 months (no accounting integrations) | Reconcile + query-hashed CSV + IATI = audit-grade; Xero/QB/Sage sync is brittle, vendor-locked, distracts from core workflows |
| 2026-10-11 | Funded support retainer for field sync incidents (SLA: <4h field ops) | Operational requirement, not technical; named on-call, runbook, budget line in grants; volunteer devs unacceptable for beneficiary-facing ops |
| 2026-10-11 | DPO appointed + Supabase region documented + breach drill dated before Phase 3 | GDPR Art. 37/33/30 compliance prerequisite for high-risk beneficiary PII processing; no "later" acceptable |
