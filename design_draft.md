# NGO OS Feature Inventory and Doc-Code Alignment

*   **Author:** Combi
*   **Status:** Draft
*   **Date:** 2026-11-11

## Overview

NGO OS is a fullstack Next.js 16 operating system for any non-governmental organization, backed by Supabase. It is built to serve full-fledged NGOs and small teams alike, with features that plug in as the organization grows or as needs surface. It includes a public website, donor/volunteer intake, field PWA, admin command center, and Stripe donations.

The codebase claims production readiness, but docs claim something else and are out of sync. There is no single source of truth showing what is actually implemented. This design produces a code-verified feature inventory for the entire codebase, flags dead code for removal, and aligns docs to match code exactly. Instead of a manually maintained inventory, code is the single source of truth: one generator script emits a structured inventory manifest (JSON/Markdown) from existing verify scripts, and CI fails the build if committed output drifts from code.

## The Problem

NGO OS has no reliable record of what is implemented versus what is only documented. README.md, ARCHITECTURAL_REVIEW.md, production-readiness-notes.md, and 12-roadmap.md contradict each other and contradict the code. The code claims production readiness while the donation flow is incomplete, E2E tests are missing, monitoring is absent, Arabic RTL is unverified, and `en-US` formatting is hardcoded in places.

`supabase/archive/` holds 24 superseded schema files that nobody maintains — the warning of what happens when documentation is unowned. Nothing in the code or docs signals which features are core (every NGO gets them) versus optional (plug in as the org grows), so adopters cannot tell what to enable for a small team versus a full-fledged operation.

The existing tracking process is real but invisible: 17 verification scripts statically check server actions, RLS policies, i18n usage, migration ordering, and edge functions, and `pnpm verify` runs them on every push/PR. But their output is pass/fail console text, not a navigable artifact. Engineers, product, and auditors have no consumable map of the system.

## Goals

* Produce a single, code-verified feature inventory for the entire NGO OS codebase.
* Rewrite docs to match code exactly, with no aspirational claims.
* Flag dead code for removal and remove it on the same PR that deletes the code.
* Make code the single source of truth; generate the inventory manifest from code via CI.
* Fail the build in CI when committed docs diverge from generated output.
* Tag every feature as `core` or `optional plugin`, and as `implemented`, `half-baked`, `bloated`, or `high-potential`, so any NGO can adopt incrementally.
* Version the inventory and tie each release to a git tag.

## Non-Goals

* Manually maintained prose inventory that engineers must keep in sync by hand.
* Full SRE instrumentation (alerts, dashboards) for documentation drift.
* SSO, WebAuthn, or multi-currency support.
* New features until P0 production-readiness gaps are closed.
* Opinionated bundles that force small teams to adopt features they do not need.

## Open Questions

* **Question 1**: Who is the named owner responsible for ongoing doc/code synchronization, and what is the review cadence?
* **Question 2**: Which features are classified as core versus optional plugin for the first-pass inventory?
* **Question 3**: Should `supabase/archive/` contents be fully removed or only deprecated from the active inventory?

## Technical Plan (Architecture)

### Proposed changes

1. **Create `scripts/generate-inventory.mjs`** — a single generator script that reads code, migrations, i18n message files, edge functions, feature gates, and docs supersession status, and emits a structured inventory manifest (JSON and Markdown). It consolidates the knowledge currently scattered across 17 verification scripts into one consumable artifact.

2. **Extend existing verify scripts as data sources** — `generate-inventory.mjs` reuses the existing checkers (`verify-action-auth.mjs`, `verify-rls-isolation.mjs`, `verify-i18n*.mjs`, `verify-migrations.mjs`, `verify-functions.mjs`, and the rest) rather than duplicating them, so the manifest cannot drift from code by construction.

3. **Add a CI job** — regenerates the inventory on every PR and fails the build if committed output diverges from generated output. This is the drift gate.

4. **Tag features** — each inventory entry is marked `core` or `optional plugin`, and `implemented`, `half-baked`, `bloated`, or `high-potential`. Status markers `implemented`, `deprecated`, `planned-for-deletion`, or `deleted` cross-reference `12-roadmap.md` Phase 4 and `docs/14-architecture-decisions.md` (ADR-0001).

5. **Deprecate `supabase/archive/`** — its 24 superseded schema files are marked deprecated in the active inventory so dead schema versions are not mistaken for live features.

6. **Scope the first pass** — Phase 4 cut-the-bloat surface and production-readiness P0 gaps, not the entire codebase, to keep maintenance bounded.

### Data flow

```text
Source of truth                    Generator                         Consumers
---------------                    ---------                         ----------
src/actions/                       generate-inventory.mjs            Engineers (grep, IDE)
supabase/migrations/   --------->   reads + consolidates --------->   Product (navigable map)
supabase/functions/                          emits JSON/Markdown      Auditors (versioned artifact)
messages/*.json                                  to design_draft.md
src/lib/env.ts (feature gates)
docs/* (supersession status)

CI job: regenerate on every PR; fail build if committed output is stale
```

### Files identified for change

| File | Action | Rationale |
|------|--------|-----------|
| `scripts/generate-inventory.mjs` | Create | Central generator that emits the inventory manifest from existing verify script data sources. |
| `.github/workflows/web-ci.yml` | Modify | Add the CI job that regenerates the inventory and fails the build on drift. |

### Verification

* `pnpm verify` already runs the 17 verification scripts; the new CI job adds inventory regeneration plus drift check on top.
* The build fails if committed docs diverge from generated output — this is the primary verification gate.
* Version each release and tie to a git tag so auditors have a versioned artifact.

## Alternatives Considered

### Alternative A: Hand-written prose feature inventory

*   **Pros**: Human-readable; familiar format for auditors and product; no code to write.
*   **Cons**: Duplicates the 17 existing verification scripts; will drift on the same timeline as every other doc; no owner or budget; engineers will ignore it; cannot express modularity (core vs. optional, maturity tags) reliably because those labels would be hand-maintained.
*   **Reason for Rejection**: Rejected by author: creates a third source of truth (code + docs + inventory) destined to rot, repeating the existing failure mode where docs claim production readiness while code does not. Six of seven Goldfish lenses reject this form.

### Alternative B: Do nothing, rely on console verify output

*   **Pros**: Zero new code; uses tooling that already exists and runs in CI.
*   **Cons**: Non-engineering consumers cannot read console output; no navigable artifact exists for auditors or product; no modularity guidance for adopters; no versioning or rollback story.
*   **Reason for Rejection**: Rejected by author: auditors, product, and engineers need a consumable, versioned artifact; console pass/fail output is not sufficient.

### Alternative C: Full SRE instrumentation (alerts, dashboards) for documentation drift

*   **Pros**: Real-time visibility into doc/code drift; operational awareness for oncall.
*   **Cons**: Overkill for documentation; no PagerDuty-worthy signal for a doc mismatch; adds monitoring overhead without reducing drift.
*   **Reason for Rejection**: Rejected by author: a CI build fail is sufficient drift detection for documentation; full SRE instrumentation is not proportionate to the risk.

### Alternative D: Extend existing verify scripts to emit a structured inventory manifest in CI (selected)

*   **Pros**: Near-zero marginal cost per change; cannot drift by construction; CI-gated; consumable by auditors, product, and engineers; naturally expresses core vs. optional plugins from feature gates and module boundaries; versioned by git tag.
*   **Cons**: Requires writing one generator script; still needs a named owner for ongoing review cadence.
*   **Reason for Acceptance**: Accepted by author: code remains the single source of truth; the manifest is a derived, CI-gated view; reuses existing verify script knowledge rather than duplicating it.

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `scripts/generate-inventory.mjs` (Create)

*   **Type / Scope**: Node.js script (`.mjs`), part of the `scripts/` verification tooling.
*   **Proposed Changes**: A single generator script that reads the existing verify script data sources and emits a structured inventory manifest in JSON and Markdown. It consumes:
    *   Server actions from `src/actions/` — guard status, permissions, authorizePermission() usage (reuses `verify-action-auth.mjs` logic).
    *   Migrations from `supabase/migrations/` — tables, RLS status (reuses `verify-migrations.mjs` logic).
    *   i18n message files from `messages/` — locale coverage, missing keys (reuses `verify-i18n*.mjs` logic).
    *   Edge functions from `supabase/functions/` (reuses `verify-functions.mjs` logic).
    *   Feature gates from `src/lib/env.ts` — `isStripeConfigured`, `isFieldReportIntakeConfigured`, etc.
    *   Docs supersession status from `README.md`, `ARCHITECTURAL_REVIEW.md`, `production-readiness-notes.md`, `12-roadmap.md`.
    *   Output: `inventory.manifest.json` and `inventory.manifest.md` (committed artifacts), each entry tagged `core` or `optional plugin`, maturity `implemented`/`half-baked`/`bloated`/`high-potential`, and status `implemented`/`deprecated`/`planned-for-deletion`/`deleted`.
*   **Why necessary**: Converts existing pass/fail console verification output into a navigable, versioned artifact. Cannot drift from code by construction because it reads code directly.

#### 2. `.github/workflows/web-ci.yml` (Modify)

*   **Type / Scope**: CI build configuration (GitHub Actions workflow).
*   **Proposed Changes**: Add a CI job that runs `scripts/generate-inventory.mjs` on every push/PR touching `src/actions/`, `supabase/migrations/`, `supabase/functions/`, `messages/`, `src/lib/env.ts`, or `docs/`. The job compares generated output against committed manifest files and fails the build if they diverge.
*   **Why necessary**: Provides the drift gate — CI fails when committed docs diverge from generated output, preventing the inventory from becoming stale wallpaper.

#### 3. `scripts/generate-inventory.test.mjs` (Create)

*   **Type / Scope**: Unit test file for the generator script (vitest, matching repo conventions).
*   **Proposed Changes**: Test coverage for manifest emission (all data sources read correctly), tag assignment (core/optional, maturity, status), and drift detection (build fails when output diverges).
*   **Why necessary**: Verifies the generator behaves correctly and the drift gate works before it blocks CI.

### Verification Plan

*   **Compilation/Build**: `pnpm build` — must pass with the new CI job added.
*   **Unit Tests**: `pnpm test` (vitest) — includes `scripts/generate-inventory.test.mjs`.
*   **Static Analysis & Linting**: `pnpm lint` (eslint) — applies to the new `.mjs` scripts.
*   **Test Coverage Requirement**: Generator script must be covered by unit tests for manifest emission and drift detection logic.
*   **E2E/Integration**: `pnpm verify` — the existing static verify gates (typecheck, lint, verify-action-auth, verify-rls-isolation, verify-migrations, verify-i18n, verify-functions) continue to run; the new CI job adds inventory regeneration + drift check on top.



