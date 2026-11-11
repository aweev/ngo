# NGO OS Feature Inventory and Doc-Code Alignment

*   **Author:** Combi
*   **Status:** Draft
*   **Date:** 2026-11-11

## Overview

NGO OS is a fullstack Next.js 16 operating system for any non-governmental organization, backed by Supabase. It is built to serve NGOs of any size, with features teams add as they grow or as needs surface. It includes a public website, donor/volunteer intake, field PWA, admin command center, and Stripe donations. The codebase claims production readiness, but docs claim something else and are out of sync. There is no one authoritative record showing what is actually implemented. This design produces a code-verified feature inventory for the entire codebase, flags dead code for removal, and aligns docs to match code exactly. Instead of a manually maintained inventory, code is the one authoritative record: one generator script emits a structured inventory manifest (JSON/Markdown) from existing verify scripts, and CI fails the build if committed output drifts from code.

## The Problem

NGO OS has no reliable record of what is implemented versus what is only documented. ../../README.md, ../../ARCHITECTURAL_REVIEW.md, ../production-readiness-notes.md, and ../12-roadmap.md contradict each other and contradict the code. The code claims production readiness while the donation flow is incomplete, E2E tests are missing, monitoring is absent, Arabic RTL is unverified, and `en-US` formatting is hardcoded in places.

`supabase/archive/` holds 24 superseded schema files that nobody maintains — the warning of what happens when documentation is unowned. Nothing in the code or docs signals which features are core (every NGO gets them) versus optional (teams add them as they grow), so adopters cannot tell what to enable for a small team versus a large operation.

The existing tracking process is real but invisible: 12 verification scripts statically check server actions, RLS policies, i18n usage, migration ordering, and edge functions, and `pnpm verify` runs them on every push/PR. But their output is pass/fail console text, not a navigable artifact. Engineers, product, and auditors have no readable map of the system.

## Goals

* Produce a single, code-verified feature inventory for the entire NGO OS codebase.
* Rewrite docs to match code exactly, with no aspirational claims.
* Flag dead code for removal and remove it on the same PR that deletes the code.
* Generate the inventory manifest from code via CI.
* Fail the build in CI when committed docs diverge from generated output.
* Tag every feature as `core` or `optional plugin`, and as `implemented`, `partial`, `unused`, or `planned`, so any NGO can adopt incrementally.
* Version the inventory and tie each release to a git tag.

## Non-Goals

* Manually maintained prose inventory that engineers must keep in sync by hand.
* Full SRE instrumentation (alerts, dashboards) for documentation drift.
* SSO, WebAuthn, or multi-currency support.
* New features until P0 production-readiness gaps are closed.
* Opinionated bundles that force small teams to adopt features they do not need.

## Open Questions (resolved)

* **Question 1 — Owner & cadence**: The engineer who owns `scripts/` (verification tooling) is the named owner for ongoing doc/code synchronization. Review cadence: quarterly, aligned to `pnpm verify` runs. The `scripts/` owner also owns `generate-inventory.mjs`, the CI drift job, and the committed manifest files.
* **Question 2 — Core vs optional plugin (first pass)**:
  * **Core** (every NGO gets): auth/RBAC, public website, donor/volunteer intake, field PWA basic (register/log/sync), admin command center, finance basics, Stripe donations (env-gated), offline sync, RLS multi-tenancy, i18n (5 locales).
  * **Optional plugin** (teams add as they grow): AI copilot (`ai-copilot.ts`), campaigns (separate from `projects`), governance/HR/reviews (`governance.ts`, `workers.ts`, `volunteers.ts`), tags system (`tags.ts`), notification templates (`notifications.ts`), advanced automations (`automations.ts` beyond basic cron), integrations builder (`integrations.ts`), portal experience, briefing system.
* **Question 3 — `supabase/archive/`**: **Delete**. The 24 superseded schema files are dead code — they do nothing to the live system. Mark them `deleted` status in the active inventory (not `deprecated`) and remove the directory.

## Technical Plan (Architecture)

### Proposed changes

1. **Create `scripts/generate-inventory.mjs`** — a single generator script that reads code, migrations, i18n message files, edge functions, feature gates, and docs supersession status, and emits a structured inventory manifest (JSON and Markdown). It consolidates the knowledge currently scattered across 12 verification scripts into one readable artifact.

2. **Extend existing verify scripts as data sources** — `generate-inventory.mjs` reuses the existing checkers (`verify-action-auth.mjs`, `verify-rls-isolation.mjs`, `verify-i18n*.mjs`, `verify-migrations.mjs`, `verify-functions.mjs`, and the rest) rather than duplicating them, so the manifest cannot drift from code by construction.

3. **Add a CI job** — regenerates the inventory on every PR and fails the build if committed output diverges from generated output. This is the drift gate.

4. **Tag features** — each inventory entry is marked `core` or `optional plugin`, and `implemented`, `partial`, `unused`, or `planned`. Status markers `implemented`, `planned-for-deletion`, or `deleted` cross-reference `../12-roadmap.md` Phase 4 and `../14-architecture-decisions.md` (ADR-0001).

5. **Delete `supabase/archive/`** — its 24 superseded schema files are dead code (do nothing to the live system). Remove the directory and mark its entries `deleted` in the active inventory.

6. **Scope the first pass** — Phase 4's removal of unused features and critical production-readiness gaps, not the entire codebase, to keep maintenance bounded.

### Data flow

```text
Source of truth                    Generator                         Consumers
---------------                    ---------                         ----------
src/actions/                       generate-inventory.mjs            Engineers (grep, IDE)
supabase/migrations/   --------->   reads + consolidates --------->   Product (navigable map)
supabase/functions/                          emits JSON/Markdown      Auditors (versioned artifact)
messages/*.json                                  to inventory.manifest.json / inventory.manifest.md
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

* `pnpm verify` already runs the 12 verification scripts; the new CI job adds inventory regeneration plus drift check on top.
* The build fails if committed docs diverge from generated output — this is the primary verification gate.
* Version each release and tie each release to a git tag so auditors have a versioned artifact.

## Alternatives Considered

### Alternative A: Hand-written prose feature inventory

*   **Pros**: Human-readable; familiar format for auditors and product; no code to write.
*   **Cons**: Duplicates the 12 existing verification scripts; will drift on the same timeline as every other doc; no owner or budget; engineers will ignore it; cannot express modularity (core vs. optional, maturity tags) reliably because those labels would be hand-maintained.
*   **Reason for Rejection**: Rejected — decision recorded in EGM brainstorm (egm-brainstorm session). Creates a third source of truth (code + docs + inventory) destined to rot, repeating the existing failure mode where docs claim production readiness while code does not.

### Alternative B: Do nothing, rely on console verify output

*   **Pros**: Zero new code; uses tooling that already exists and runs in CI.
*   **Cons**: Non-engineering consumers cannot read console output; no navigable artifact exists for auditors or product; no modularity guidance for adopters; no versioning or rollback story.
*   **Reason for Rejection**: Rejected — decision recorded in EGM brainstorm (egm-brainstorm session). Auditors, product, and engineers need a readable, versioned artifact; console pass/fail output is not sufficient.

### Alternative C: Full SRE instrumentation (alerts, dashboards) for documentation drift

*   **Pros**: Real-time visibility into doc/code drift; operational awareness for oncall.
*   **Cons**: Overkill for documentation; no PagerDuty-worthy signal for a doc mismatch; adds monitoring overhead without reducing drift.
*   **Reason for Rejection**: Rejected — decision recorded in EGM brainstorm (egm-brainstorm session). A CI build fail is sufficient drift detection for documentation; full SRE instrumentation is not proportionate to the risk.

### Alternative D: Extend existing verify scripts to emit a structured inventory manifest in CI (selected)

*   **Pros**: Almost no extra work per change; CI-gated; readable by auditors, product, and engineers; naturally expresses core vs. optional plugins from feature gates and module boundaries; versioned by git tag.
*   **Cons**: Requires writing one generator script; still needs a named owner for ongoing review cadence.
*   **Reason for Acceptance**: Accepted — decision recorded in EGM brainstorm (egm-brainstorm session). Code remains the one authoritative record; the manifest is a derived, CI-gated view; reuses existing verify script knowledge rather than duplicating it.

## Risks & Mitigations

**CI drift false positives blocking builds.** If the generator produces output that diverges from the committed manifest on a PR that did not intend to change the inventory, CI blocks the merge.
*Mitigation:* dry-run mode that emits a diff without failing, a manual override path, and an opt-out label (`skip-inventory-drift`) for PRs that intentionally change the manifest without code changes.

**Generator correctness.** A bug in `generate-inventory.mjs` could corrupt the committed manifest or emit wrong tags.
*Mitigation:* snapshot tests with deterministic output, schema validation of the manifest JSON before commit, and unit tests covering all data-source readers.

**Security implications of publishing an inventory.** The manifest lists feature gates and module structure, which could expose internal implementation details.
*Mitigation:* No secrets or credentials in the manifest output; access controls on versioned artifacts; the manifest describes feature presence, not implementation details or credentials.

**Scalability of scanning the full codebase on every PR.** As the codebase grows, regenerating the inventory on every push/PR could slow CI.
*Mitigation:* Incremental caching of scan results; scope the first pass to the Phase 4 surface as already planned; full-codebase regeneration runs nightly rather than on every PR.

**Dead-code removal risk.** Flagging code as `unused` or `deleted` and removing it could break dynamically loaded code or code referenced only at runtime.
*Mitigation:* Dynamic-import audit before deletion; search the codebase for string references to the symbol/file before removal; soft-deprecate first, remove after a release cycle.

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
    *   Output: `inventory.manifest.json` and `inventory.manifest.md` (committed artifacts), each entry tagged `core` or `optional plugin`, maturity `implemented`/`partial`/`unused`/`planned`, status `implemented`/`planned-for-deletion`/`deleted`.
*   **Classification rubric** (decision rules, applied deterministically by the generator):
    *   `core` vs `optional plugin`: `core` if the feature is referenced by a server action in `src/actions/` that is not itself marked `optional` in `src/lib/env.ts` feature gates; otherwise `optional plugin`.
    *   Maturity `implemented`: feature gate present in `src/lib/env.ts` AND verify script for its domain passes (e.g., `verify-action-auth` for actions, `verify-migrations` for tables). Maturity `partial`: gate present but verify script fails or domain partially covered. Maturity `unused`: no references in `src/actions/` or `supabase/migrations/` and no feature gate. Maturity `planned`: referenced in `12-roadmap.md` Phase 4 but not yet implemented in code.
    *   Status `implemented`: code exists and verify passes. `planned-for-deletion`: listed in `12-roadmap.md` Phase 4 for removal. `deleted`: code removed from the tree (e.g., `supabase/archive/` superseded schemas).
    *   Tie-breaker: ambiguous cases default to `optional plugin` / `partial` / `implemented` (least aggressive).
*   **Verify-script reuse mechanism**: `generate-inventory.mjs` reads the same source files as the verify scripts (not importing them, since they are CLI scripts that call `process.exit()`). It mirrors their checks: scans `src/actions/` for guards (mirrors `verify-action-auth.mjs`), reads `supabase/migrations/` for tables/RLS (mirrors `verify-migrations.mjs`), reads `messages/*.json` for locale coverage (mirrors `verify-i18n*.mjs`), reads `supabase/functions/*/index.ts` (mirrors `verify-functions.mjs`), reads `src/lib/env.ts` for feature gates, reads docs supersession status. Same inputs, independent scanning logic — cannot drift from code by construction.
*   **CI drift comparison method**: CI runs `node scripts/generate-inventory.mjs --check`. The `--check` flag writes generated output to a temp directory, then compares file contents byte-for-byte against the committed `inventory.manifest.json` and `inventory.manifest.md` at repo root. Exits non-zero on any difference. The default (no `--check`) writes directly to the committed manifest files.
*   **Missing source file handling**: If a docs supersession source is missing (e.g., `ARCHITECTURAL_REVIEW.md` renamed), the generator logs a warning to stderr, marks that entry as `not assessed`, and continues — it does not fail.
*   **Phasing & checkpoints**:
    *   Phase 1: `scripts/generate-inventory.mjs` + `scripts/generate-inventory.test.mjs` created; generator runs standalone (`node scripts/generate-inventory.mjs`), produces valid JSON/Markdown; `pnpm test` passes. Exit criteria: generator emits valid manifest, tests pass.
    *   Phase 2: `.github/workflows/web-ci.yml` modified to add inventory drift job running `--check` (fails build on drift). Exit criteria: CI job runs on PRs touching watched paths.
    *   Phase 3: Drift check made blocking (`--check` exits non-zero fails build). Exit criteria: `pnpm build` fails when committed manifest diverges from generated output.
*   **Why necessary**: Converts existing pass/fail console verification output into a navigable, versioned artifact. Cannot drift from code by construction because it reads code directly.

#### 2. `.github/workflows/web-ci.yml` (Modify)

*   **Type / Scope**: CI build configuration (GitHub Actions workflow).
*   **Proposed Changes**: Add a CI job that runs `scripts/generate-inventory.mjs` on every push/PR touching `src/actions/`, `supabase/migrations/`, `supabase/functions/`, `messages/`, `src/lib/env.ts`, or `docs/`. The job compares generated output against committed manifest files and fails the build if they diverge.
*   **Why necessary**: Provides the drift gate — CI fails when committed docs diverge from generated output, preventing the committed inventory from going stale.

#### 3. `scripts/generate-inventory.test.mjs` (Create)

*   **Type / Scope**: Unit test file for the generator script (vitest, matching repo conventions).
*   **Proposed Changes**: Test coverage for manifest emission (all data sources read correctly), tag assignment (core/optional, maturity, status), and drift detection (build fails when output diverges).
*   **Why necessary**: Verifies the generator behaves correctly and the drift gate works before it blocks CI.

### Verification Plan

*   **Compilation/Build**: `pnpm build` — must pass with the new CI job added.
*   **Unit Tests**: `pnpm test` (vitest) — includes `scripts/generate-inventory.test.mjs`.
*   **Static Analysis & Linting**: `pnpm lint` (eslint) — applies to the new `.mjs` scripts.
*   **Test Coverage Requirement**: Generator script must be covered by unit tests for manifest emission and drift detection logic.
*   **E2E/Integration**: `pnpm verify` — the existing static verify gates (typecheck, lint, verify-action-auth, verify-rls-isolation, verify-migrations, verify-i18n, verify-functions) continue to run; the new CI job adds inventory regeneration plus drift check on top.

*Drafted with EGM*
