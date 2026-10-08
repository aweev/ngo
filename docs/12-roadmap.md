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
freeze public site to Home/About/Financials (or extract to a static repo).

## Later — Phase 5: adoption

CSV/XLSX importer with dry-run, 7→3-step onboarding, Swahili/Hausa field
strings (current de/es serve donors, not field staff), one error tracker,
backup/PITR drill record, support path with named owner, hosting-cost sheet.

## Open questions for leadership (decisions required)

1. Split the marketing site out of this repo? (Recommended: yes, static.)
2. Single-currency enforcement stays until real multi-currency UX ships?
   (Recommended: yes — current hard block.)
3. Household-vs-individual MVP scope per sector (health/protection need the
   hardest PII handling — determines columns)?
4. `de`/`es` → `sw`/`ha` locale swap for field?
5. Ledger boundary: CSV-first for 12 months, no accounting integrations?
   (Recommended: yes.)
6. Who answers when sync breaks in a village with no IT (funded support)?
7. DPO named? Supabase region documented? Breach drill dated?

## Decision log (append, never rewrite)

| Date | Decision | Rationale |
|---|---|---|
| Phase 0 | Fabricated grant-report fields deleted, not "fixed" | A lying report is worse than an empty one |
| Phase 0 | MFA fail-closed over fail-open | Enrolled users must never silently downgrade to AAL1 |
| Phase 1 | Hand-rolled IndexedDB, no Dexie dependency | One less dependency for a two-dev team; memory fallback keeps it testable |
| Phase 1 | Duplicates flagged, never auto-merged | Merge is a human safeguarding decision |
| Phase 2 | Unmapped IATI nodes omitted with warnings | Invented sectors/funders are audit fraud |
| Fonts | System stacks, Google Fonts removed | Build/dev/field must all work with zero egress |
