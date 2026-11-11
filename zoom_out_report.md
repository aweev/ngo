# Zoom Out Review Report — Stage 5 (Initial Zoom Out)

**Target:** `docs/designs/ngo-os-feature-inventory.md` (full file, lines 1–152)
**Reviewers:** egm-zoom-out, egm-inventive-catalyst
**Date:** 2026-11-11

---

## egm-zoom-out Findings

**Context Sufficiency:** Objective is clear (code-verified feature inventory, align docs to code, CI drift gate, tag features core/optional + maturity). Not a blocker — proceeding to findings.

### 🟡 Major — Root Problem Focus (contradiction: "code is single source of truth" vs. human-assigned maturity labels)

**Scope:** Goals (line 28); Technical Plan (lines 55–56); Detailed Implementation Plan (line 129)

**Discrepancy:** The design claims code is the single source of truth and the manifest "cannot drift by construction" (lines 26, 51, 130), yet it requires tagging every feature with maturity labels `implemented`/`half-baked`/`bloated`/`high-potential` and status `implemented`/`deprecated`/`planned-for-deletion`/`deleted`. These are subjective judgments that cannot be derived automatically from code.

**Rationale:** If maturity/status labels are hand-assigned, the manifest becomes a manually maintained artifact that drifts from code — exactly the failure mode this design exists to fix. This undermines the core value proposition (code-verified inventory) at the root level.

**Suggested resolution:** Derive as much as possible from code (feature-gate presence for core/optional, file existence for implemented/deprecated). For subjective maturity labels, either (a) make them explicitly manual/editorial with a named owner and cadence, separated from the auto-generated portion, or (b) define deterministic, code-derived proxies (e.g., verify-script pass/fail, test coverage) and document the mapping. Do not claim "cannot drift by construction" for human-assigned labels.

---

### 🟡 Major — Scope contradiction

**Scope:** Goals (line 23); Technical Plan / "Scope the first pass" (line 59)

**Discrepancy:** Goal states "Produce a single, code-verified feature inventory for the entire NGO OS codebase" (line 23), but the technical plan scopes the first pass to "Phase 4 cut-the-bloat surface and production-readiness P0 gaps, not the entire codebase" (line 59).

**Rationale:** The deliverable scope is ambiguous: is the inventory comprehensive (entire codebase) or bounded (P0/Phase 4 only)? This affects what the CI drift gate covers, what auditors can rely on, and how much maintenance is bounded.

**Suggested resolution:** Reconcile the scope. Either commit to a full-codebase inventory generated in one pass, or explicitly phase it (P0 first, remainder later) and state which parts are covered by the drift gate in phase 1.

---

### 🟡 Major — Technical feasibility: unverified reuse of verify scripts as data sources

**Scope:** Technical Plan (line 51); Detailed Implementation Plan (lines 122–129); Alternatives D (line 109)

**Discrepancy:** The document claims the generator "reuses the existing checkers … rather than duplicating them, so the manifest cannot drift from code by construction." However, the verify scripts emit pass/fail console text (line 19), and the document does not explain how console output is converted into structured manifest data, or whether the scripts must be refactored into importable modules.

**Rationale:** Without a defined reuse mechanism, the generator may end up duplicating verify-script logic (creating drift between the two) or parsing fragile console output. The "cannot drift by construction" claim is unsubstantiated.

**Suggested resolution:** Specify the reuse mechanism: either refactor verify scripts into shared importable modules consumed by both CLI and generator, or define a structured output format (JSON) for verify scripts that the generator reads. Validate against the actual script inventory.

---

### 🟢 Nit — Factual inaccuracy: verify script count

**Scope:** Overview (line 11); Problem (line 19); Verification (line 85)

**Discrepancy:** The document repeatedly cites "17 verification scripts." The `scripts/` directory contains 15 `.mjs` files total, of which 11 are named `verify-*` (the rest are seed scripts, test runners, and a license checker).

**Rationale:** The document's premise is code-verified accuracy; an unverified script count undermines credibility and suggests the inventory inputs have not been reconciled with code.

**Suggested resolution:** Verify the actual count against `scripts/` and update the document (or source the count programmatically from the generator).

---

### 🟢 Nit — Anti-Weeds / Altitude Control: code-level identifiers in design prose

**Scope:** Detailed Implementation Plan, `scripts/generate-inventory.mjs` (line 127)

**Discrepancy:** Line 127 names specific env feature-gate variables: `isStripeConfigured`, `isFieldReportIntakeConfigured`.

**Rationale:** Per the Zoom Out anti-weeds standard, high-level design sections should describe interfaces and data flows, not code-level variable names. Naming specific gates ties the doc to implementation details that may change.

**Suggested resolution:** Describe at interface level: "feature gates from `src/lib/env.ts`" without listing specific variable names.

---

### 🟢 Nit — Data flow artifact name inconsistency

**Scope:** Data flow diagram (line 69); Detailed Implementation Plan (line 129)

**Discrepancy:** The data flow diagram (line 69) states the generator emits JSON/Markdown "to design_draft.md," while the detailed plan defines committed output as `inventory.manifest.json` and `inventory.manifest.md` (line 129). `design_draft.md` already exists at the repo root as a separate artifact.

**Rationale:** Confusing output artifact names create ambiguity about what the CI drift gate compares against and what consumers should read.

**Suggested resolution:** Correct line 69 to reference `inventory.manifest.json`/`inventory.manifest.md`, and remove the erroneous `design_draft.md` reference.

---

## egm-inventive-catalyst Findings

### 🔴 Blocker — CI drift gate enforcement vs. developer velocity

**Scope:** CI drift gate (lines 53, 135); `.github/workflows/web-ci.yml` modification

**Contradiction / blind spot:** The design accepts a consistency vs. velocity trade-off as inevitable: CI fails the build whenever the committed manifest diverges from generated output. This forces every PR touching `src/actions/`, migrations, functions, i18n, `env.ts`, or `docs/` to include manifest regeneration in the same commit, or the build blocks. What the design is not seeing: generated-artifact fail-closed gates are a known source of process drag — they create manifest churn, merge conflicts on committed JSON/Markdown, and incentivize engineers to game or weaken the gate to keep CI green.

**Strongest counter-argument:** "A drift gate with teeth is the only thing that prevents docs from rotting; advisory checks are ignored."

**Is it justified?** Partially — detection must be real, but enforcement need not block the author's build.

**Inevitable trade-off accepted:** Synchronization correctness at the cost of developer velocity and PR friction.

**Inventive transform (no compromise):** Split detection from enforcement in time and actor. CI emits a non-blocking drift report (a required-to-pass check that produces a diff), and an auto-commit bot (Dependabot/Renovate-style) opens a PR that regenerates and commits the manifest whenever drift is detected. The original author's build never blocks; docs self-heal via bot PR; humans review only the bot's commit. Ideal result: zero manual regeneration effort, always-in-sync docs, no build friction. This also resolves governance because no named human owner is needed for steady-state sync.

---

### 🔴 Blocker — Maturity tagging as subjective human judgment

**Scope:** Maturity tagging (`implemented` / `half-baked` / `bloated` / `high-potential`) (lines 28, 55, 129)

**Contradiction / blind spot:** The design declares "code is the single source of truth" while assigning maturity labels that static analysis cannot emit. "Half-baked," "bloated," and "high-potential" are qualitative judgments with no corresponding signal in code, migrations, i18n files, or feature gates. The design is not seeing that these labels must be hand-injected into an allegedly code-derived artifact, recreating the exact third-source-of-truth failure mode Alternative A was rejected for.

**Strongest counter-argument:** "Product and auditors need human-readable maturity guidance; code can't express 'this feature is half-baked.'"

**Is it justified?** Yes — maturity and bloat are inherently opinion-based; no static check defines them.

**Inevitable trade-off accepted:** Code-truth purity sacrificed for subjective human labeling.

**Inventive transform (no compromise):** Derive maturity algorithmically from observable signals instead of opinion: feature gate default state (on/off), verification-script pass rate, test coverage %, migration staleness, and last-modified age map deterministically to `implemented` / `half-baked` / `bloated` / `high-potential` via a published scoring rule. Human reviewers can override, but overrides are versioned and reviewed as exceptions. No human judgment is baked into the default manifest; code truth is preserved, and auditors get the maturity map they need.

---

### 🟡 Major — Consolidation vs. coupling in verify-script reuse

**Scope:** `generate-inventory.mjs` reusing verify-script logic (lines 51, 122–128)

**Contradiction / blind spot:** The generator "reuses" verify-script logic but defines no mechanism — does it import the `.mjs` checkers, shell-parse their console output, or re-implement their checks? If it re-implements, the manifest can drift from the 17 verify scripts (duplicated logic, second source of truth). If it imports them, the generator becomes a brittle god-script tightly coupled to checker internals; every verify-script change forces generator changes.

**Strongest counter-argument:** "Reusing existing checkers is near-zero marginal cost and prevents duplication by construction."

**Is it justified?** Only if the reuse mechanism is structurally sound; as written, it is underspecified and risky.

**Inevitable trade-off accepted:** Tool consolidation at the cost of tight coupling / duplication risk.

**Inventive transform (no compromise):** Give every verify script a structured-output contract — each emits JSON conforming to a common schema. `generate-inventory.mjs` becomes a pure aggregator that consumes checker JSON and never re-implements a check. Zero duplication, zero re-implementation drift, and checkers remain independently runnable.

---

### 🟡 Major — Circular dependency: docs supersession status as generator input

**Scope:** Docs supersession status as generator input (lines 55, 128)

**Contradiction / blind spot:** The generator reads docs supersession status from `README.md`, `ARCHITECTURAL_REVIEW.md`, `production-readiness-notes.md`, and `12-roadmap.md` — the very documents whose accuracy is in question. The tool meant to align docs to code inherits its inputs from the docs being corrected; if the docs are wrong (the stated premise), the inventory amplifies their errors and cannot correct them.

**Strongest counter-argument:** "We must start somewhere; parsing existing docs supersession status bootstraps the inventory."

**Is it justified?** No — this is pure circularity; it cannot resolve the drift it was designed to detect.

**Inevitable trade-off accepted:** Bootstrapping from existing prose over correctness.

**Inventive transform (no compromise):** Break the cycle — docs are outputs, never inputs. Supersession status comes from a machine-readable source: ADR frontmatter (`docs/14-architecture-decisions.md`, ADR-0001) or a `docs/superseded.json` registry maintained alongside ADRs, plus git history for deletion timestamps. The generator's sole inputs are code, migrations, i18n, edge functions, and feature gates; docs are generated from the manifest, not fed into it.

---

### 🟡 Major — `supabase/archive/` deprecation without sunset clause

**Scope:** `supabase/archive/` deprecation (lines 57, 61; Open Question 3)

**Contradiction / blind spot:** Deprecation without a sunset clause repeats the exact failure mode the archive already evidences: unowned documentation rots forever. Marking 24 superseded schemas "deprecated" with no removal deadline means dead schema versions linger in the active inventory indefinitely — the "temporary becomes permanent" problem.

**Strongest counter-argument:** "The archive is history/audit trail; removing it loses information about how the schema evolved."

**Is it justified?** Only for genuine historical preservation, which the active inventory is not the right place for.

**Inevitable trade-off accepted:** History preservation over inventory clarity.

**Inventive transform (no compromise):** Sunset clause — deprecated entries carry `sunsetDate` (git tag + N releases), and CI fails after sunset if the file remains. Alternatively, move the archive out of the active inventory into a separate git-lfs/history repository (preserved, versioned, not mistaken for live features). The active inventory stays clean; history isn't destroyed, it's relocated.

---

### 🟡 Major — Governance / named owner absence

**Scope:** Governance / named owner (Open Question 1, line 41; line 113)

**Contradiction / blind spot:** An automated drift gate with no accountable operator. CI blocks on drift, but Open Question 1 admits no one is named to own ongoing synchronization or review cadence. The design is not seeing that when the gate blocks a merge, someone must unblock it — and with no owner, the gate becomes a permanent blocker or gets quietly disabled.

**Strongest counter-argument:** "Every process needs an owner; automation can't replace accountable governance."

**Is it justified?** For policy decisions (maturity tag changes, deprecation), yes. For routine sync, no.

**Inevitable trade-off accepted:** Human governance assumed where automation could operate.

**Inventive transform (no compromise):** Eliminate human ownership of steady-state sync via the auto-commit bot from Finding 1 — bots regenerate and commit the manifest on drift; humans review only exceptions (maturity/status overrides, sunsets). Governance is reserved for semantic decisions, not clerical synchronization. No named owner required for the inventory to stay current.

---

### 🟢 Nit — First-pass scoping creates completeness illusion

**Scope:** First-pass scoping (line 59)

**Contradiction / blind spot:** Scoping the first pass to Phase 4 + P0 gaps creates a completeness illusion: adopters may infer that out-of-scope features are unimportant, nonexistent, or safe to ignore, producing incorrect adoption decisions for small teams vs. full NGOs.

**Strongest counter-argument:** "Bounded scope keeps maintenance tractable; a full-codebase inventory on day one is over-engineering."

**Is it justified?** For initial effort, yes; for the published artifact's implications, no.

**Inventive transform (no compromise):** Generate over the whole codebase (marginal cost is near zero once automated — Alternative D's own argument) but publish bounded views: the full manifest exists as a versioned artifact; docs and the adopter guide surface the P0-scoped view. Completeness in data, bounded presentation — no compromise.

---

### 🟢 Nit — i18n coverage checks miss named production gaps

**Scope:** i18n coverage (lines 15, 125)

**Contradiction / blind spot:** The problem statement names "Arabic RTL is unverified" and "`en-US` formatting is hardcoded in places" as production gaps, yet the inventory's i18n source checks only locale coverage and missing keys. i18n could be marked `implemented` while RTL rendering and hardcoded formatting are broken — false assurance for auditors.

**Strongest counter-argument:** "The inventory tracks feature presence, not rendering correctness; RTL belongs in E2E/visual testing, which is out of scope."

**Is it justified?** For a static inventory, partially — but then the gap should be explicitly labeled, not silently implied as covered.

**Inevitable trade-off accepted:** Static checkability over real-world correctness.

**Inventive transform (no compromise):** Extend static checks to catch the named gaps: AST audit for hardcoded date/number formatting (enforce `Intl`), and RTL markers (`dir` attributes, logical CSS properties). Explicitly mark unassessed concerns as `not assessed` rather than implying `implemented`. The inventory then catches the exact production gaps the design itself identifies.

---

## Core Contradiction Summary

The design's central tension is **"code is the single source of truth" vs. "human judgment must label maturity, supersede docs, own governance, and unblock CI."** Every inventive transform above removes a human-in-the-loop from a process the design automates everywhere else, replacing opinion with observable signals and clerical sync with bots. The Ideal Final Result: a versioned, always-current feature inventory with zero manual regeneration, zero subjective defaults, zero circular inputs, and zero build friction — achieved through structured-output checkers, derived maturity scoring, docs-as-output, sunset clauses, and auto-commit drift remediation.
