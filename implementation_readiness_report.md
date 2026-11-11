# Implementation Readiness Report — Stage 9

**Target:** `docs/designs/ngo-os-feature-inventory.md`
**Range:** DetailedRange = lines 132–169 (Detailed Implementation Plan)
**Reviewers:** egm-implementation-readiness, egm-codebase-details, egm-style
**Standards:** Implementation Readiness Standard; Codebase Details Standard; Plain-English Standard
**Date:** 2026-11-11

---

## egm-implementation-readiness Findings

### 🔴 Blocker — Classification rubric leaves zero-decision violations (tag/maturity/status assignment)

**Affected scope:** `scripts/generate-inventory.mjs` Proposed Changes, lines 139–147

**Discrepancy:** The plan requires the implementer to assign, for every inventory entry, a tag (`core` or `optional plugin`), a maturity level (`implemented`/`half-baked`/`bloated`/`high-potential`), and a status (`implemented`/`deprecated`/`planned-for-deletion`/`deleted`), but provides **zero decision criteria** for any of these classifications. Whether a feature is "core" vs "optional plugin", "half-baked" vs "high-potential", or "deprecated" vs "planned-for-deletion" is a subjective design/judgment call left entirely to the implementer.

**Rationale:** Direct violation of the Zero-Decision Rule. The implementer must make design choices (classification taxonomy and edge-case handling for ambiguous features) that are not pre-documented. Two implementers could produce different manifests from the same codebase, undermining the drift gate's reliability.

**Suggested resolution:** Pre-determine and document an explicit classification rubric — e.g., decision rules mapping observable code signals (presence in `src/lib/env.ts` feature gates, table count in migrations, RLS status, locale coverage, doc supersession markers) to each tag/maturity/status value, with a defined tie-breaker for ambiguous cases.

---

### 🔴 Blocker — Verify-script reuse mechanism unspecified (lines 139–143)

**Affected scope:** `scripts/generate-inventory.mjs` Proposed Changes, lines 139–143

**Discrepancy:** The plan states the script "reuses `verify-action-auth.mjs` logic", "`verify-migrations.mjs` logic", "`verify-i18n*.mjs` logic", and "`verify-functions.mjs` logic" but does not specify **how** reuse occurs — whether by importing/requiring the existing modules, reimplementing their parsing, shelling out to them, or copying logic. It also does not specify the exact parsing/read logic for each data source (file globs, JSON schema, error handling for missing/malformed files).

**Rationale:** Dependency selection and integration method are architectural choices left to the implementer, violating the Zero-Decision Rule. The resulting script's behavior (what counts as a "read correctly" data source) is undefined.

**Suggested resolution:** Document the exact reuse mechanism (e.g., "import `verifyActionAuth` from `scripts/verify-action-auth.mjs` and call `X`"), the exact file globs/paths read from each source, the expected input schema, and error-handling behavior for missing or malformed sources.

---

### 🔴 Blocker — CI drift comparison method unspecified (lines 149–153)

**Affected scope:** `.github/workflows/web-ci.yml` Proposed Changes, lines 149–153

**Discrepancy:** The CI job "compares generated output against committed manifest files and fails the build if they diverge," but the comparison method is unspecified: exact byte-for-byte comparison, semantic diff, ignore-whitespace, which command/script performs the check, and whether the job regenerates in a temp dir and diffs, or writes directly and checks `git diff --exit-code`.

**Rationale:** The drift-gate implementation is an architectural/edge-case choice left to the implementer. Without a deterministic comparison method, "diverges" is undefined, so CI behavior cannot be predicted or verified.

**Suggested resolution:** Specify the exact comparison mechanism (e.g., "run `node scripts/generate-inventory.mjs --check`, exit non-zero on any stdout diff vs committed `inventory.manifest.json`/`.md`"), the working directory, and whether regeneration is write-back or read-only.

---

### 🟡 Major — No concrete test cases (lines 155–159, 161–167)

**Affected scope:** `scripts/generate-inventory.test.mjs` (Create), lines 155–159, and Verification Plan, lines 161–167

**Discrepancy:** The test plan lists coverage areas ("manifest emission", "tag assignment", "drift detection") but provides **no specific test cases**: no mock inputs, no expected outputs, no edge cases (missing data source, malformed migration, unknown locale, empty functions dir, superseded doc). Acceptance criteria are limited to "must pass" for `pnpm build`/`pnpm test`/`pnpm lint`/`pnpm verify` without defined thresholds.

**Rationale:** Test design (cases, inputs, expected results, edge-case handling) is left to the implementer, violating the Zero-Decision Rule and weakening the Test Plan required area. Vague "must pass" criteria make phase completion unverifiable.

**Suggested resolution:** Enumerate concrete test cases with fixtures and expected outputs (e.g., "given `src/lib/env.ts` with `isStripeConfigured = false`, manifest entry `payments` has tag `optional plugin`"), including at least one edge case per data source. Define pass/fail thresholds for build/lint/test.

---

### 🟡 Major — No phasing & checkpoints (lines 132–169)

**Affected scope:** Phasing & Checkpoints, lines 132–169 (entire Detailed Implementation Plan)

**Discrepancy:** The plan lists three files to create/modify and a verification plan, but does **not partition work into incremental phases** with defined entry/exit criteria. There is no checkpoint stating what "stable, buildable, and testable" means after each phase (e.g., "Phase 1: generator runs standalone and produces valid JSON; Phase 2: CI job added; Phase 3: tests added; Phase 4: drift gate enforced").

**Rationale:** Violates the Phasing & Checkpoints requirement. Without phase gates, the implementer cannot verify intermediate stability, and a broken state could be committed without detection.

**Suggested resolution:** Split into numbered phases with explicit checkpoints, e.g., Phase 1 (generator script + unit tests, runnable locally, `pnpm test` passes), Phase 2 (CI job added, drift check runs but is non-blocking), Phase 3 (drift check fails the build). Each phase must state its buildable/testable exit criteria.

---

### 🟢 Nit — Missing edge-case handling for source files (lines 145, 167)

**Affected scope:** Docs supersession sources (line 145); Verification Plan (line 167)

**Discrepancy:** Docs supersession sources and `pnpm verify` gates are enumerated by name, but the plan does not state what happens if a source file is missing or renamed (e.g., `ARCHITECTURAL_REVIEW.md` does not exist), nor whether `pnpm verify` sub-commands are run in parallel/serially and how failures aggregate.

**Rationale:** Minor edge-case handling gap; easy to fix but worth documenting for determinism.

**Suggested resolution:** Document behavior for missing source files (skip with warning vs. fail) and the `pnpm verify` invocation form.

---

## egm-codebase-details Findings

### 🔴 Blocker — References non-existent file `.github/workflows/web-ci.yml`

**Affected scope:** Section `### 2. .github/workflows/web-ci.yml (Modify)`, lines 149–153; cross-referenced in Verification Plan line 163 (`pnpm build — must pass with the new CI job added`).

**Discrepancy description:** The document proposes to *modify* `.github/workflows/web-ci.yml` to add a CI drift-gate job, but neither the file nor the `.github/workflows/` directory exists. A glob of `.github/workflows/*` returned no files.

**Rationale:** The drift gate ("CI fails when committed docs diverge from generated output") is the central mechanism of the design. Because the target file and its parent directory are absent, the proposed CI job cannot be added as a *modification*; the document must instead *create* the file and directory from scratch. As written, verification plan line 163 cannot be satisfied.

**Suggested correction:** Change the entry from "(Modify)" to "(Create)" and create `.github/workflows/web-ci.yml` (plus the `.github/` and `.github/workflows/` directories) containing the inventory-drift job that runs `scripts/generate-inventory.mjs` on pushes/PRs touching `src/actions/`, `supabase/migrations/`, `supabase/functions/`, `messages/`, `src/lib/env.ts`, or `docs/`, comparing output against the committed manifest and failing on divergence.

---

### ✅ Verified-as-accurate (no findings)

| Referenced item | Location in doc | Codebase evidence |
|---|---|---|
| `scripts/verify-action-auth.mjs` (+ `authorizePermission()` guard logic) | Line 140 | `scripts/verify-action-auth.mjs:39` (`GUARD_RE` matches `authorizePermission`); `authorizePermission()` used in `src/actions/portal-experience.ts:49`, `src/actions/reporting.ts:114` |
| `scripts/verify-migrations.mjs` | Line 141 | `scripts/verify-migrations.mjs` exists |
| `supabase/migrations/` (tables, RLS) | Line 141 | 47 migration `.sql` files present |
| `scripts/verify-i18n*.mjs` | Line 142 | `verify-i18n.mjs`, `verify-i18n-usage.mjs`, `verify-i18n-hardcoded.mjs` exist |
| `messages/` (locale JSON) | Line 142 | `messages/{en,fr,de,ar,es}.json` exist |
| `supabase/functions/` (edge functions) | Line 143 | `supabase/functions/{notification-dispatcher,webhook-delivery,cron-runner,automation-engine,_shared}/` exist |
| `scripts/verify-functions.mjs` | Line 143 | `scripts/verify-functions.mjs` exists |
| `src/lib/env.ts` feature gates (`isStripeConfigured`, `isFieldReportIntakeConfigured`) | Line 144 | `src/lib/env.ts:181` (`isStripeConfigured`), `:196` (`isFieldReportIntakeConfigured`) |
| `src/actions/` (server actions, guards, permissions) | Line 140 | 46 action files present; `authorizePermission()` imported/used |
| `README.md`, `ARCHITECTURAL_REVIEW.md`, `production-readiness-notes.md`, `12-roadmap.md` | Line 145 | All four exist (root `README.md`, root `ARCHITECTURAL_REVIEW.md`, `docs/production-readiness-notes.md`, `docs/12-roadmap.md`) |
| vitest unit tests | Line 157-159 | `vitest.config.mts` exists; `pnpm test` = `vitest run` |
| eslint | Line 165 | `pnpm lint` = `eslint .` |
| `pnpm build` / `pnpm verify` | Lines 163-167 | `pnpm build` = `next build`; `pnpm verify` defined in `package.json:23` |

**Bottom line:** The design is technically sound and reuses existing, stable utilities throughout. The single blocking issue is the nonexistent `.github/workflows/web-ci.yml`; correcting it to a create (with the new directory) makes the plan fully implementable.

---

## egm-style Findings

### 🟢 Nit — Line 153: decorative metaphor ("stale wallpaper")

**Affected scope:** Line 153, "Why necessary" for the CI workflow change — `...preventing the inventory from becoming stale wallpaper.`

**Style issue:** Decorative idiom/metaphor. The Plain-English Standard discourages decorative language; the technical point (docs going out of sync with code) is expressed through a figure of speech rather than a direct statement.

**Rationale:** "Stale wallpaper" adds imagery but no substance. A plain statement of the failure mode is clearer and jargon-free.

**Suggested replacement:** `...preventing the committed inventory from going stale — i.e., diverging from the code it documents.`

---

### 🟢 Nit — Line 146: vague, promotional-sounding tag value ("high-potential")

**Affected scope:** Line 146, output tag taxonomy — `maturity implemented/half-baked/bloated/high-potential`.

**Style issue:** "High-potential" is a buzzword-adjacent, undefined judgment used as a formal tag value. Unlike `implemented`, `deprecated`, `half-baked`, or `bloated`, it does not describe an observable state of the code.

**Rationale:** Tag values in a schema should map to observable facts so the CI drift check can assign them deterministically. "High-potential" is vague and reads like promotional language.

**Suggested replacement:** Replace with a criterion-based label, e.g. `candidate-for-adoption`, and define the criterion (e.g., "referenced by two or more features but not yet wired into any action"), or drop the tag if no observable criterion exists.

---

### 🟢 Nit — Line 139: redundant decorative adjective ("structured")

**Affected scope:** Line 139 — `...emits a structured inventory manifest in JSON and Markdown.`

**Style issue:** "Structured" is a decorative adjective that adds no information — JSON and Markdown already define the structure.

**Rationale:** Under the Plain-English Standard, adjectives that carry no substantive meaning should be dropped.

**Suggested replacement:** `...emits an inventory manifest in JSON and Markdown.`

---

## Summary

| Severity | Count | Reviewer |
|----------|-------|----------|
| 🔴 Blocker | 4 | Implementation Readiness (3), Codebase Details (1) |
| 🟡 Major | 2 | Implementation Readiness (2) |
| 🟢 Nit | 6 | Implementation Readiness (1), Style (3), Codebase Details (0) |

**Implementation readiness verdict: NOT READY.** The plan fails the Zero-Decision Rule on three counts (classification rubric, verify-script reuse mechanism, CI drift comparison method) plus one Codebase Details blocker (nonexistent CI file proposed as modification). Two Majors (no concrete test cases, no phase checkpoints) remain. All must be resolved before the implementation plan can be executed by an engineer without making independent design choices.
