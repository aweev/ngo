# NGO OS Feature Inventory and Doc-Code Alignment

* **Author:** Combi
* **Date:** 2026-11-11

## Overview

NGO OS is a fullstack Next.js 16 operating system for any non-governmental organization, backed by Supabase. It is not specific to one org (AWE was an early instance); it is built to serve NGOs of any size, with features teams add as they grow or as needs surface. It includes a public website, donor/volunteer intake, field PWA, admin command center, and Stripe donations. The codebase claims production readiness while docs claim something else and are out of sync; there is no one authoritative record showing what is actually implemented. This effort produces an accurate, code-verified feature inventory for the entire codebase, flags dead code for removal, and aligns docs to match code exactly. Consumers are engineers, product, and auditors; the dev team owns ongoing synchronization.

## Analysis

### What is wrong with the current state

* The code claims "production ready" but has an incomplete donation flow, missing E2E tests, absent monitoring, unverified Arabic RTL, and hardcoded `en-US` formatting in places.
* Docs claim another state. README.md, ARCHITECTURAL_REVIEW.md, production-readiness-notes.md, and 12-roadmap.md contradict each other and the code. ARCHITECTURAL_REVIEW.md carries a 2026-11-04 banner noting that sections are superseded by roadmap docs.
* There is no tracking process with clarity; "everything is just there."
* `supabase/archive/` holds 24 superseded schema files that nobody maintains — the warning of what happens to unowned documentation.
* Nothing in the code or docs signals which features are core (every NGO gets them) versus optional (teams add them as they grow), so adopters cannot tell what to enable for a small team versus a large operation.

### The proposed approach: modular, code-verified feature inventory

NGO OS is deliberately modular: a small team starts with the core (auth, RBAC, public site, intake) and teams add field PWA, finance, donations, and advanced ops as the org grows. The inventory must reflect this — it must mark each feature as core or optional, indicate its maturity (implemented, partial, unused, planned), and show whether it is verified against code. Docs must be rewritten to match code exactly, and dead code flagged for removal.

### Goldfish lens findings

**Contrarian / YAGNI.** The premise that no tracking process exists is false. The repo ships 12 verification scripts (`verify-action-auth.mjs`, `verify-rls-isolation.mjs`, `verify-i18n*.mjs`, `verify-migrations.mjs`, `verify-functions.mjs`, and more), and `pnpm verify` runs them on every push/PR. A manual inventory duplicates this tooling and will drift on the same timeline as every other doc — the exact failure mode already present. Adding a third source of truth (code + docs + inventory) is worse than fixing the two that exist.

**Cost, Quota & Token Economics.** Hand-inventorying roughly the entire codebase (46 server-action files, ~302 actions, 53 migrations, 83 tenant tables, 5 locale message files with ~2,000 keys each, 28 docs, 24 archive SQL files, 7 edge functions) is weeks of engineer time with no budget line, no CI compute allocation, and no headcount. The ongoing per-PR sync tax will be the first thing skipped under deadline pressure. For a modular NGO OS, the inventory must also track which features are optional plugins so adopters don't pay for what they don't use.

**UX & Developer Ergonomics.** A static Markdown inventory has no search, no jump-to-definition, no link from a doc line to the implementing code, and no diff of what changed. Engineers will treat it as stale wallpaper and ignore it — reproducing the exact "docs lie" problem. Five existing docs already force cross-referencing. For adopters, the inventory must answer "what do I get out of the box versus what do I add later?"

**Migration & Backward Compatibility.** The inventory becomes a third authoritative source alongside code and existing docs, with no versioning or rollback story. "Planned for deletion" versus "deleted" could be misread by auditors. Any inventory must reference `12-roadmap.md` Phase 4 and `docs/14-architecture-decisions.md` (ADR-0001) so planned deletions are not mistaken for completed removals. Optional plugins must have a stable add/remove story so existing orgs are not broken when new features ship.

**Observability & SRE Debuggability.** There are zero metrics or alerts on doc/code drift. No canary, no freshness check, no runbook entry for inventory drift. At 3 AM oncall has no signal that the inventory is wrong.

**Long-Term Tech Debt & Maintenance.** This repeats the brittle docs-code coupling that is already the project's core failure mode. "The dev team owns synchronization" is an aspiration, not a named role, job description, or performance objective. The inventory will rot in two years like `supabase/archive/`. For a modular product, unowned inventory becomes the next layer of dead code that small teams trip over.

**Inventive Catalyst.** The proposal accepts as inevitable the trade-off "docs lie vs. code truth." That is a false dichotomy. The resolution is to eliminate the compromise: generate the inventory from code. Code becomes the one authoritative record; the manifest is a derived, CI-gated view. The verify scripts already encode the "what is implemented and verified" knowledge in executable form; only the emission step is missing. Generation also naturally expresses modularity — core versus optional plugins — by reading feature gates and module boundaries from code rather than hand-labeling them.

### Ideal Final Result

Code, migrations, and the verify scripts are the one authoritative record. One generator script emits a structured inventory manifest (JSON/Markdown) from server actions (guard status, permissions), migrations (tables, RLS status), i18n (locale coverage, missing keys), edge functions, feature gates, and docs supersession status. CI regenerates on every PR and fails the build if committed output is stale. Consumers read the generated manifest; engineers navigate via grep/IDE; auditors get a versioned artifact tied to a git tag. Dead code is flagged and removed on the same PR that removes the code. `supabase/archive/` contents are removed from the active inventory so dead schema versions are not mistaken for live features. Each entry is tagged core-or-optional and implemented/partial/unused/planned so any NGO — small team or large operation — can see what to enable and what to add as it grows.

## Goals vs. Non-Goals

* **In-Scope Goals:** code-verified feature inventory for the entire codebase; docs rewritten to match code exactly; dead code flagged for removal; single readable artifact; CI drift gate that fails the build when committed docs diverge from generated output; modularity tags (core vs. optional plugin) and maturity tags (implemented, partial, unused, planned) so any NGO can adopt incrementally.
* **Out-of-Scope Non-Goals:** manually maintained prose inventory; full SRE instrumentation (alerts/dashboards) for doc drift; SSO/WebAuthn/multi-currency; new features until P0 production-readiness gaps are closed; opinionated bundles that force small teams to adopt features they do not need.

## Alternatives Weighed

1. Hand-written prose feature inventory — Rejected: duplicates existing verify scripts, will drift, has no owner, is unbudgeted, and engineers will ignore it. Six of seven Goldfish lenses reject this form. It also cannot express modularity reliably because maturity and core/optional labels would be hand-maintained.
2. Extend existing verify scripts to emit a structured inventory manifest in CI — Accepted: almost no extra work per change, CI-gated, readable by auditors, product, and engineers; naturally expresses core vs. optional plugins from feature gates and module boundaries.
3. Do nothing, rely on console verify output — Rejected: non-engineering consumers cannot read console output; no navigable artifact exists for auditors or product; no modularity guidance for adopters.
4. Full SRE instrumentation (alerts, dashboards) for doc drift — Rejected: overkill for documentation; a CI fail is sufficient.

## Key Decisions & Staging for Next Steps

* Do not write a manually maintained feature inventory brief.
* Build (or extend) one generator script from the existing verify scripts that emits a JSON/Markdown inventory manifest.
* Add a CI job that regenerates the inventory and fails the build if committed docs diverge from generated output.
* Version the inventory and tie each release to a git tag.
* Mark features as `implemented`, `planned-for-deletion`, or `deleted`, cross-referencing `12-roadmap.md` Phase 4 and `docs/14-architecture-decisions.md` (ADR-0001).
* Tag each feature as `core` or `optional plugin`, and as `implemented`, `partial`, `unused`, or `planned`, so any NGO can adopt incrementally — small team starts with core, larger org adds more as it grows.
* Scope the first pass to the Phase 4 removal of unused features and the production-readiness P0 gaps — not "everything" — so maintenance is bounded.
* Assign a named owner and review cadence before starting.
* Delete `supabase/archive/` contents from the active inventory.
* Remove dead code on the same PR that removes the code; regenerate the inventory in the same commit.
