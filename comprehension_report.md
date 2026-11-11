# Comprehension Report — Stage 6 (Comprehension Test)

**Target:** `docs/designs/ngo-os-feature-inventory.md`
**Reviewer:** egm-comprehension
**FeatureRange:** lines 1–114
**DetailedRange:** lines 115–152
**Date:** 2026-11-11

## What the feature does

NGO OS needs a single, code-verified catalog of everything the system actually implements, so documentation stops contradicting the codebase. The proposal is a new generator script, `scripts/generate-inventory.mjs`, that reads the codebase — server actions, Supabase migrations and edge functions, i18n message files, feature flags in `src/lib/env.ts`, and the supersession status of key docs — plus the knowledge embedded in the repo's 17 existing verification scripts, and emits a structured inventory manifest as committed JSON and Markdown files.

Every inventory entry is tagged two ways: `core` or `optional plugin` (what every NGO gets versus what plugs in as the organization grows), and a maturity level of `implemented`, `half-baked`, `bloated`, or `high-potential`, plus a lifecycle status of `implemented`, `deprecated`, `planned-for-deletion`, or `deleted`. The 24 superseded schemas in `supabase/archive/` would be marked deprecated so they are not mistaken for live features.

A CI job regenerates the inventory on every push/PR and fails the build if the committed manifest diverges from what the generator produces, making code the single source of truth and preventing the inventory from becoming stale. The first pass is scoped to Phase 4 / production-readiness P0 gaps rather than the entire codebase, and the inventory is versioned and tied to git tags for auditors.

## How it fits

The feature plugs into NGO OS's existing verification tooling instead of replacing it. The repo already runs 17 verification scripts (`pnpm verify`) on every push/PR that statically check server actions, RLS policies, i18n, migrations, and edge functions — but they emit only pass/fail console text. The new generator reuses those scripts' checks as data sources without duplicating them, consolidating their knowledge into one navigable artifact.

It extends the CI pipeline (`.github/workflows/web-ci.yml`) with a drift-gate job triggered by changes to `src/actions/`, `supabase/migrations/`, `supabase/functions/`, `messages/`, `src/lib/env.ts`, or `docs/`. The committed manifest is meant to sit alongside the docs it replaces — `README.md`, `ARCHITECTURAL_REVIEW.md`, `production-readiness-notes.md`, `12-roadmap.md`, and `docs/14-architecture-decisions.md` (ADR-0001) — whose status markers the inventory cross-references. Consumers are engineers (grep, IDE), product (navigable map), and auditors (versioned artifact). Ongoing verification continues through `pnpm build`, `pnpm test` (vitest, including a new generator test), `pnpm lint`, and `pnpm verify`.

---

### Finding 1 — 🟡 Major
**Affected scope:** Lines 41–43, 57, 59

**What a fresh reader would not understand:** Three open questions are left unresolved: who owns ongoing doc/code synchronization and the review cadence, which features are `core` versus `optional plugin` in the first pass, and whether `supabase/archive/` is removed or deprecated. The Technical Plan simultaneously declares the archive deprecated (line 57) while Open Question 3 asks exactly that (line 43), and line 59 scopes the first pass to an undefined "Phase 4 cut-the-bloat surface." A fresh reader cannot tell who maintains the inventory, what belongs in the initial scope, or the fate of the archive schemas.

**Suggested clarification:** Resolve the open questions or state provisional answers with owners and decision dates; define the Phase 4 / P0-gap scope inline; reconcile line 57 with Open Question 3.

---

### Finding 2 — 🟡 Major
**Affected scope:** Lines 19, 51–52, 121–129

**What a fresh reader would not understand:** Line 19 states the 17 verification scripts emit only pass/fail console text, yet the generator is said to "reuse" them as data sources and read code directly so the manifest "cannot drift by construction." It is unexplained how the generator consumes console-text scripts as structured data — whether the scripts must first be refactored to emit structured output, whether the generator re-runs and parses them, or whether it duplicates their logic. Without this, a fresh reader cannot judge whether the "cannot drift by construction" claim holds.

**Suggested clarification:** Describe the consumption mechanism (e.g., scripts refactored to share logic, output parsing, or direct source reading) and note any prerequisite changes to the verify scripts.

---

### Finding 3 — 🟡 Major
**Affected scope:** Lines 55, 59, 119, 128

**What a fresh reader would not understand:** The first pass is bounded by "Phase 4 cut-the-bloat surface and production-readiness P0 gaps," and status markers cross-reference `12-roadmap.md` Phase 4 and `docs/14-architecture-decisions.md` (ADR-0001), but neither Phase 4 nor the P0 gaps are defined in the document. A fresh reader must leave the document to learn what is in or out of scope. Likewise, `supabase/archive/` and the supersession status of `README.md`, `ARCHITECTURAL_REVIEW.md`, `production-readiness-notes.md`, and `12-roadmap.md` are treated as inputs, but it is unexplained how the generator detects that a document is superseded (frontmatter, marker text, file location?).

**Suggested clarification:** Define the Phase 4 scope and P0 gap list inline (or link to a stable anchor), and describe the supersession-detection signal; confirm the referenced documents exist.

---

### Finding 4 — 🟡 Major
**Affected scope:** Lines 63–74 versus line 129

**What a fresh reader would not understand:** The data-flow diagram says the generator emits JSON/Markdown "to design_draft.md" (line 69), an artifact named nowhere else in the document, which conflicts with the committed outputs specified at line 129 (`inventory.manifest.json` and `inventory.manifest.md`). A fresh reader cannot reconcile where the generator output actually goes.

**Suggested clarification:** Remove or define `design_draft.md`, and align the diagram with the committed manifest filenames.

---

### Finding 5 — 🟢 Nit
**Affected scope:** Line 129

**What a fresh reader would not understand:** Where the committed manifest files live in the repository (root, `docs/`, `scripts/`?) is not stated.

**Suggested clarification:** State the commit location of `inventory.manifest.json` and `inventory.manifest.md`.

---

### Finding 6 — 🟢 Nit
**Affected scope:** Lines 51, 69, 127

**What a fresh reader would not understand:** Input paths (`messages/*.json`, `src/lib/env.ts`) are not qualified from the repository root, and line 51 says the generator reuses the named checkers "and the rest" without enumerating the remaining verification scripts, so a fresh reader cannot locate all inputs.

**Suggested clarification:** Qualify paths from the repo root and enumerate the 17 verification scripts or link to their location.

---

### Finding 7 — 🟢 Nit
**Affected scope:** Lines 29, 87

**What a fresh reader would not understand:** Versioning is required ("tie each release to a git tag") but the mechanism is unspecified: who creates tags, what versioning scheme, and whether tagging is manual or CI-driven.

**Suggested clarification:** Describe the versioning/tagging process and who is responsible.

---

### Finding 8 — 🟢 Nit
**Affected scope:** Line 96

**What a fresh reader would not understand:** "Six of seven Goldfish lenses reject this form" references an internal review framework (Goldfish lenses, seven reviewers) that is not defined in the document.

**Suggested clarification:** Define the term or rephrase the rejection rationale in plain language.
