# Critic Review Report — Stage 7 (Critic Review)

**Target:** `docs/designs/ngo-os-feature-inventory.md`
**Range:** FeatureRange = lines 1–114 (Overview through Alternatives Considered)
**Reviewers:** egm-design, egm-structural, egm-style
**Standards:** Feature Specification Standard (design, structural); Plain-English Standard (style)
**Date:** 2026-11-11

---

## egm-design Findings

### 🔴 Blocker — Missing Risks & Mitigations section

**Affected scope:** Whole document (lines 1–114); required area "Risks & Mitigations" entirely absent.

**Discrepancy:** The specification contains no Risks & Mitigations / Risks & Limits section anywhere in lines 1–114. The sections present are Overview, The Problem, Goals, Non-Goals, Open Questions, Technical Plan (Architecture), and Alternatives Considered.

**Rationale:** The Feature Specification Standard explicitly requires the specification to call out its own constraints — potential failure modes, security implications, scalability limits, and mitigations — and lists Risks & Mitigations as a required area (if applicable). A code-verified inventory generator with a CI drift gate ("fail the build if committed output diverges") has concrete, undocumented risks: false-positive drift blocking merges, generator bugs corrupting the manifest, the versioned manifest exposing internal feature gates/module structure, generator runtime scaling with codebase size, and the risk of removing "dead" code that is dynamically loaded. None of these failure modes or mitigations are addressed.

**Suggested resolution:** Add a "Risks & Mitigations" section after Alternatives Considered covering at least: (1) CI drift false positives blocking builds — mitigation: dry-run mode, manual override path, opt-out label; (2) generator correctness — mitigation: snapshot tests, deterministic output, schema validation of the manifest; (3) security implications of publishing an inventory/feature-gates manifest — mitigation: no secrets in output, access controls on versioned artifacts; (4) scalability of scanning the full codebase on every PR — mitigation: incremental caching, scope the first pass to the Phase 4 surface as already planned; (5) dead-code removal risk — mitigation: dynamic-import audit before deletion.

---

### 🟡 Major — Alternatives attribution without linked decision record

**Affected scope:** Alternatives Considered, lines 89–114 (Alternatives A–D).

**Discrepancy:** Every rejection/acceptance rationale attributes the decision to "the author" ("Rejected by author:" / "Accepted by author:") without linking the issue, discussion, or PR where the decision was recorded.

**Rationale:** The Alternatives Rule is mandatory: rejection rationales must state concrete technical or scope trade-offs *and* must not attribute a rejection to a maintainer without linking their issue, discussion, or PR. The cons listed for Alternatives A–C do contain concrete trade-offs (A: creates a third source of truth destined to rot; B: console pass/fail is not a consumable/versioned artifact; C: full SRE instrumentation is disproportionate to doc-mismatch risk). However, attributing the decision to an unnamed maintainer without a linked decision record makes the rationale non-auditable and fails the rule's attribution constraint. Alternative D's acceptance carries the same defect ("Accepted by author" with no linked record).

**Suggested resolution:** Replace "Rejected by author" / "Accepted by author" with attribution to the linked decision record (issue, discussion, or PR ref/URL) for each alternative, e.g., "Rejected — decided in #<issue>" or "Accepted — see PR <link>". Alternatively, rephrase each rationale to stand solely on the documented technical/scope trade-offs and add a "Decision recorded in:" line with the relevant link per alternative.

---

## egm-structural Findings

### 🟡 Major — Unresolved relative cross-references

**Scope:** Lines 15, 55, 69 (same defect pattern also at line 128, outside range)

**Issue:** The document references several files using relative paths that do not resolve from its location in `docs/designs/`:
* Line 15 / 128: `README.md`, `ARCHITECTURAL_REVIEW.md`, `production-readiness-notes.md`, `12-roadmap.md`
* Line 55: `12-roadmap.md` Phase 4 and `docs/14-architecture-decisions.md` (ADR-0001)
* Line 69: `design_draft.md` (inside the data-flow code block)

Verified actual locations in the repo:
* `12-roadmap.md` → `docs/12-roadmap.md` (from `docs/designs/`: `../12-roadmap.md`, not `12-roadmap.md`)
* `14-architecture-decisions.md` → `docs/14-architecture-decisions.md` (should be `../14-architecture-decisions.md`, not `docs/14-architecture-decisions.md`)
* `production-readiness-notes.md` → `docs/production-readiness-notes.md` (should be `../production-readiness-notes.md`)
* `ARCHITECTURAL_REVIEW.md` → repo root (should be `../../ARCHITECTURAL_REVIEW.md`); root `README.md` → `../../README.md`
* `design_draft.md` → **does not exist anywhere in the repo**, and it contradicts the documented output artifacts `inventory.manifest.json` / `inventory.manifest.md` (line 129)

**Rationale:** Cross-references are an explicit review focus. Links that 404 force readers to hunt for targets and undermine the document's role as a reliable single source of truth. Multiple broken links constitute a structural defect, not merely a cosmetic one.

**Suggested fix:** Rewrite each link with the correct path relative to `docs/designs/` (or use repo-root-relative paths), verify every link resolves, and replace or remove the dangling `design_draft.md` reference in the data-flow diagram — align it with `inventory.manifest.json` / `inventory.manifest.md`.

---

### 🟢 Nit — Framing sections slightly interrupt canonical sequence

**Scope:** Lines 31–44 (`## Non-Goals`, `## Open Questions`) sitting between `## Goals` (line 21) and `## Technical Plan (Architecture)` (line 45)

**Issue:** The review mandate's prescribed flow is problem → goals → architecture → alternatives → implementation. The document inserts `Non-Goals` and `Open Questions` between Goals and the architecture section.

**Rationale:** Minor deviation from the prescribed sequence; the document remains readable (`Non-Goals` appropriately follows `Goals`; `Open Questions` appropriately precedes `Technical Plan`).

**Suggested fix:** No change required — acceptable as-is. If strict adherence to the mandated sequence is desired, move `Non-Goals`/`Open Questions` after `Alternatives Considered` or fold `Open Questions` into `Technical Plan`.

---

### ✅ Heading hierarchy — Pass

H1 (line 1) → H2 (lines 7, 13, 21, 31, 39, 45, 89) → H3 (lines 47, 61, 76, 83 under Technical Plan; lines 91, 97, 103, 109 under Alternatives Considered). No skipped levels; all H3s are properly nested. Section titles are descriptive and parallel (Alternatives A–D).

### ✅ Formatting consistency — Pass

Code block (lines 63–74) uses properly opened/closed ```text fences. Table (lines 78–81) has valid header/separator/row syntax. Bulleted lists are consistent throughout.

### ✅ Completeness — Pass (within range)

All expected feature-spec sections through Alternatives Considered are present: Overview, The Problem, Goals, Non-Goals, Open Questions, Technical Plan (Architecture), Alternatives Considered. `## Detailed Implementation Plan` begins at line 115, outside the review range.

---

## egm-style Findings

### 🔴 Blocker — Line 28 (Goals): Informal, subjective classification labels

**Issue:** Feature maturity tags `half-baked`, `bloated`, and `high-potential` are used as formal inventory categories.

**Rationale:** These are informal, value-judgment words, not defined states. `half-baked` is slang; `bloated` is a negative put-down without a measurable definition; `high-potential` is promotional buzzword language. A formal taxonomy built on subjective adjectives produces an inventory that different readers will score differently — it fails the plain-English standard and undermines the doc/code alignment goal.

**Suggested replacement:** Replace with plain, defined states (e.g., `implemented`, `partial`, `unused`, `planned`) and define each one in a short line so any NGO can apply them consistently.

---

### 🔴 Blocker — Line 55 (Technical Plan #4): Same informal labels repeated

**Issue:** `half-baked`, `bloated`, `high-potential` repeated as entry tags.

**Rationale:** Same as finding #1 — the same unreliable, jargon-laden labels appear in the technical specification itself, so the drift gate would be enforcing subjective labels.

**Suggested replacement:** Use the same plain, defined maturity states from finding #1 here.

---

### 🟡 Major — Line 9 (Overview): "full-fledged" and "plug in"

**Issue:** "built to serve full-fledged NGOs and small teams alike, with features that plug in as the organization grows."

**Rationale:** `full-fledged` is an ungrounded promotional adjective (what distinguishes a "full-fledged" NGO from any other?). `plug in` is buzzword imagery for simply turning a feature on or adding it.

**Suggested replacement:** "built to serve NGOs of any size, with features teams can turn on as they grow" — or specify size tiers concretely (e.g., "teams under 20 people" vs "larger organizations").

---

### 🟡 Major — Line 17 (The Problem): "plug in" and "full-fledged"

**Issue:** "optional (plug in as the org grows)" and "a small team versus a full-fledged operation."

**Rationale:** Same issues as finding #3 — decorative buzzword phrasing in a section that is supposed to state the problem plainly.

**Suggested replacement:** "optional (teams add them as they grow)" and "a small team versus a large operation."

---

### 🟢 Nit — Line 19 (The Problem): "consumable map"

**Issue:** "Engineers, product, and auditors have no consumable map of the system."

**Rationale:** `consumable` is jargon-adjacent filler; it adds nothing over "usable" or "readable."

**Suggested replacement:** "have no readable map of the system" or "have no single document they can use to understand the system."

---

### 🟢 Nit — Line 49 (Technical Plan #1): "consumable artifact"

**Issue:** "...emits a structured inventory manifest (JSON and Markdown). It consolidates the knowledge currently scattered across 17 verification scripts into one consumable artifact."

**Rationale:** Same as finding #5 — `consumable` is unnecessary jargon.

**Suggested replacement:** "...into one artifact teams can read" or "...into one usable artifact."

---

### 🟢 Nit — Line 59 (Technical Plan #6): "cut-the-bloat" and "P0"

**Issue:** "Phase 4 cut-the-bloat surface and production-readiness P0 gaps."

**Rationale:** `cut-the-bloat` is informal metaphorical phrasing; `P0` is priority jargon that external readers (product, auditors) may not know.

**Suggested replacement:** "Phase 4's removal of unused features and critical production-readiness gaps."

---

### 🟢 Nit — Line 111 (Alternatives Considered D): "Near-zero marginal cost"

**Issue:** "Near-zero marginal cost per change."

**Rationale:** `marginal cost` is economics jargon; `near-zero` is vague.

**Suggested replacement:** "Almost no extra work per change" or "little extra cost per change."

---

### 🟢 Nit — Lines 11 and 26: repeated "single source of truth"

**Issue:** "code is the single source of truth" (line 11); "Make code the single source of truth" (line 26).

**Rationale:** Industry buzzphrase repeated twice. It is a specific concept (one authoritative source) but is used decoratively both times.

**Suggested replacement:** Keep once, defined plainly: "code is the one authoritative record" or "one place that is always correct." Remove the second occurrence or rephrase.

---

## Aggregate Severity Summary

| Severity | Count | Reviewer |
|----------|-------|----------|
| 🔴 Blocker | 3 | Design (1: missing Risks & Mitigations), Style (2: subjective maturity labels) |
| 🟡 Major | 4 | Design (1: alternatives attribution), Structural (1: broken cross-references), Style (2: promotional buzzwords) |
| 🟢 Nit | 6 | Structural (1), Style (5) |

## Core Tension Across Findings

The document's strongest risk cluster is around **subjectivity masquerading as objectivity**: the manifest is sold as "code-verified" and "cannot drift by construction," yet its maturity/status labels are human-assigned subjective judgments; its alternatives attribution cites an unnamed author; and its cross-references point to documents whose accuracy is the very problem being solved. These should be resolved before the design proceeds to implementation readiness.
