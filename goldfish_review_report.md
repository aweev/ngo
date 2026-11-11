# Goldfish Annotated Review Report

**Status:** resolved

**Target:** `docs/designs/ngo-os-feature-inventory.md` (FeatureRange = lines 1-114)

## Prioritized Findings & AI Suggestions

### Issue 1 [egm-design] - Severity: Blocker

**Affected Scope:** [Lines 1-114](docs/designs/ngo-os-feature-inventory.md#L1-L114) (Whole document; required area "Risks & Mitigations" absent)

**Discrepancy Description:** The specification contains no Risks & Mitigations / Risks & Limits section anywhere in lines 1-114. The sections present are Overview, The Problem, Goals, Non-Goals, Open Questions, Technical Plan (Architecture), and Alternatives Considered.

**Rationale:** The Feature Specification Standard explicitly requires the specification to call out its own constraints — potential failure modes, security implications, scalability limits, and mitigations — and lists Risks & Mitigations as a required area (if applicable). A code-verified inventory generator with a CI drift gate ("fail the build if committed output diverges") has concrete, undocumented risks: false-positive drift blocking merges, generator bugs corrupting the manifest, the versioned manifest exposing internal feature gates/module structure, generator runtime scaling with codebase size, and the risk of removing "dead" code that is dynamically loaded. None of these failure modes or mitigations are addressed.

***AI Suggestion:*** PROPOSE FIX

***Justification:*** The finding is valid and checkable. The document lacks a required section per the Feature Specification Standard. Adding it addresses a genuine gap.

***Proposed Edit:***
* Location: After Alternatives Considered (after line 113), before Detailed Implementation Plan (line 115)
* Change: Insert a new "## Risks & Mitigations" section covering: (1) CI drift false positives blocking builds — mitigation: dry-run mode, manual override path, opt-out label; (2) generator correctness — mitigation: snapshot tests, deterministic output, schema validation of the manifest; (3) security implications of publishing an inventory/feature-gates manifest — mitigation: no secrets in output, access controls on versioned artifacts; (4) scalability of scanning the full codebase on every PR — mitigation: incremental caching, scope the first pass to the Phase 4 surface; (5) dead-code removal risk — mitigation: dynamic-import audit before deletion.

---

### Issue 2 [egm-design] - Severity: Major

**Affected Scope:** [Lines 89-114](docs/designs/ngo-os-feature-inventory.md#L89-L114) (Alternatives Considered, Alternatives A-D)

**Discrepancy Description:** Every rejection/acceptance rationale attributes the decision to "the author" ("Rejected by author:" / "Accepted by author:") without linking the issue, discussion, or PR where the decision was recorded.

**Rationale:** The Alternatives Rule is mandatory: rejection rationales must state concrete technical or scope trade-offs and must not attribute a rejection to a maintainer without linking their issue, discussion, or PR. The cons listed for Alternatives A-C do contain concrete trade-offs. However, attributing the decision to an unnamed maintainer without a linked decision record makes the rationale non-auditable and fails the rule's attribution constraint. Alternative D's acceptance carries the same defect ("Accepted by author" with no linked record).

***AI Suggestion:*** PROPOSE FIX

***Justification:*** The finding is valid. The document attributes decisions to an unnamed author without linking a decision record, violating the Alternatives Rule's attribution constraint.

***Proposed Edit:***
* Location: Lines 95, 101, 107, 113 (the "Reason for Rejection" / "Reason for Acceptance" lines in Alternatives A-D)
* Change: Replace "Rejected by author:" with "Rejected — decision recorded in: <link>" (or link to the specific issue/PR discussion where the Goldfish brainstorm decision was made). Replace "Accepted by author:" with "Accepted — decision recorded in: <link>". If no link exists yet, rephrase the rationale to stand solely on the documented technical/scope trade-offs and add a "Decision recorded in:" line per alternative.

---

### Issue 3 [egm-structural] - Severity: Major

**Affected Scope:** [Lines 15, 55, 69](docs/designs/ngo-os-feature-inventory.md#L15-L69) (The Problem, Technical Plan #5, Data flow diagram)

**Discrepancy Description:** The document references several files using relative paths that do not resolve from its location in `docs/designs/`:
* Line 15 / 128: `README.md`, `ARCHITECTURAL_REVIEW.md`, `production-readiness-notes.md`, `12-roadmap.md`
* Line 55: `12-roadmap.md` Phase 4 and `docs/14-architecture-decisions.md` (ADR-0001)
* Line 69: `design_draft.md` (inside the data-flow code block)

Verified actual locations:
* `12-roadmap.md` → `docs/12-roadmap.md` (should be `../12-roadmap.md`, not `12-roadmap.md`)
* `14-architecture-decisions.md` → `docs/14-architecture-decisions.md` (should be `../14-architecture-decisions.md`, not `docs/14-architecture-decisions.md`)
* `production-readiness-notes.md` → `docs/production-readiness-notes.md` (should be `../production-readiness-notes.md`)
* `ARCHITECTURAL_REVIEW.md` → repo root (should be `../../ARCHITECTURAL_REVIEW.md`); root `README.md` → `../../README.md`
* `design_draft.md` → does not exist anywhere in the repo

**Rationale:** Cross-references are an explicit review focus. Links that 404 force readers to hunt for targets and undermine the document's role as a reliable single source of truth.

***AI Suggestion:*** PROPOSE FIX

***Justification:*** The finding is valid and checkable — each path was verified against the actual repository layout. Broken links must be corrected.

***Proposed Edit:***
* Location: Lines 15, 55, 69 (and line 128 outside range)
* Change: Rewrite each link with the correct path relative to `docs/designs/`:
  - `README.md` → `../../README.md`
  - `ARCHITECTURAL_REVIEW.md` → `../../ARCHITECTURAL_REVIEW.md`
  - `production-readiness-notes.md` → `../production-readiness-notes.md`
  - `12-roadmap.md` → `../12-roadmap.md`
  - `docs/14-architecture-decisions.md` → `../14-architecture-decisions.md`
  - `design_draft.md` → replace with `inventory.manifest.json` / `inventory.manifest.md` (the documented output artifacts) or remove from the diagram.

---

### Issue 4 [egm-structural] - Severity: Nit

**Affected Scope:** [Lines 31-44](docs/designs/ngo-os-feature-inventory.md#L31-L44) (Non-Goals, Open Questions)

**Discrepancy Description:** The document inserts `Non-Goals` and `Open Questions` between `## Goals` and `## Technical Plan (Architecture)`, slightly interrupting the canonical problem → goals → architecture sequence.

**Rationale:** Minor deviation from the prescribed sequence; the document remains readable (`Non-Goals` appropriately follows `Goals`; `Open Questions` appropriately precedes `Technical Plan`).

***AI Suggestion:*** DECLINE

***Justification:*** This is a Nit and the document remains readable. No change required. If strict adherence to the mandated sequence is desired later, move `Non-Goals`/`Open Questions` after `Alternatives Considered`.

---

### Issue 5 [egm-style] - Severity: Blocker

**Affected Scope:** [Line 28](docs/designs/ngo-os-feature-inventory.md#L28-L28) (Goals, maturity tags)

**Discrepancy Description:** Feature maturity tags `half-baked`, `bloated`, and `high-potential` are used as formal inventory categories. These are informal, value-judgment words, not defined states. `half-baked` is slang; `bloated` is a negative put-down without a measurable definition; `high-potential` is promotional buzzword language.

**Rationale:** A formal taxonomy built on subjective adjectives produces an inventory that different readers will score differently — it fails the plain-English standard and undermines the doc/code alignment goal. The drift gate would be enforcing subjective labels.

***AI Suggestion:*** PROPOSE FIX

***Justification:*** The finding is valid. Informal labels cannot be reliably applied or verified, contradicting the document's own goal of a code-verified inventory.

***Proposed Edit:***
* Location: Lines 28, 55, 129 (all maturity tag references)
* Change: Replace `half-baked`, `bloated`, `high-potential` with plain, defined states (e.g., `implemented`, `partial`, `unused`, `planned`) and define each one in a short line so any NGO can apply them consistently.

---

### Issue 6 [egm-style] - Severity: Blocker

**Affected Scope:** [Line 55](docs/designs/ngo-os-feature-inventory.md#L55-L55) (Technical Plan #4)

**Discrepancy Description:** `half-baked`, `bloated`, `high-potential` repeated as entry tags in the technical specification.

**Rationale:** Same as Issue 5 — the same unreliable, jargon-laden labels appear in the technical specification itself, so the drift gate would be enforcing subjective labels.

***AI Suggestion:*** PROPOSE FIX

***Justification:*** Same as Issue 5 — valid finding, must be fixed for consistency.

***Proposed Edit:***
* Location: Line 55
* Change: Replace `half-baked`, `bloated`, `high-potential` with the same plain, defined maturity states from Issue 5.

---

### Issue 7 [egm-style] - Severity: Major

**Affected Scope:** [Line 9](docs/designs/ngo-os-feature-inventory.md#L9-L9) (Overview)

**Discrepancy Description:** "built to serve full-fledged NGOs and small teams alike, with features that plug in as the organization grows." `full-fledged` is an ungrounded promotional adjective; `plug in` is buzzword imagery.

**Rationale:** `full-fledged` is an ungrounded promotional adjective (what distinguishes a "full-fledged" NGO from any other?). `plug in` is buzzword imagery for simply turning a feature on or adding it.

***AI Suggestion:*** PROPOSE FIX

***Justification:*** Valid finding — promotional language in a document that should be plain and direct.

***Proposed Edit:***
* Location: Line 9
* Change: Replace "full-fledged NGOs" with "NGOs of any size" and "plug in" with "turn on as they grow" or specify size tiers concretely.

---

### Issue 8 [egm-style] - Severity: Major

**Affected Scope:** [Line 17](docs/designs/ngo-os-feature-inventory.md#L17-L17) (The Problem)

**Discrepancy Description:** "optional (plug in as the org grows)" and "a small team versus a full-fledged operation."

**Rationale:** Same issues as Issue 7 — decorative buzzword phrasing in a section that should state the problem plainly.

***AI Suggestion:*** PROPOSE FIX

***Justification:*** Valid finding — promotional language in the problem statement.

***Proposed Edit:***
* Location: Line 17
* Change: Replace "plug in as the org grows" with "add as they grow" and "full-fledged operation" with "large operation."

---

### Issue 9 [egm-style] - Severity: Nit

**Affected Scope:** [Line 19](docs/designs/ngo-os-feature-inventory.md#L19-L19) (The Problem)

**Discrepancy Description:** "Engineers, product, and auditors have no consumable map of the system." `consumable` is jargon-adjacent filler.

**Rationale:** `consumable` is unnecessary jargon that adds nothing over "usable" or "readable."

***AI Suggestion:*** DECLINE

***Justification:*** Nit-level issue; does not block understanding or undermine the document's goals. No change required.

---

### Issue 10 [egm-style] - Severity: Nit

**Affected Scope:** [Line 49](docs/designs/ngo-os-feature-inventory.md#L49-L49) (Technical Plan #1)

**Discrepancy Description:** "...consolidates the knowledge currently scattered across 17 verification scripts into one consumable artifact." `consumable` is unnecessary jargon.

**Rationale:** Same as Issue 9.

***AI Suggestion:*** DECLINE

***Justification:*** Nit-level issue; no change required.

---

### Issue 11 [egm-style] - Severity: Nit

**Affected Scope:** [Line 59](docs/designs/ngo-os-feature-inventory.md#L59-L59) (Technical Plan #6)

**Discrepancy Description:** "Phase 4 cut-the-bloat surface and production-readiness P0 gaps." `cut-the-bloat` is informal metaphorical phrasing; `P0` is priority jargon.

**Rationale:** Informal metaphor and jargon that external readers may not know.

***AI Suggestion:*** PROPOSE FIX

***Justification:*** Simple replacement that improves clarity for external readers (product, auditors).

***Proposed Edit:***
* Location: Line 59
* Change: Replace "Phase 4 cut-the-bloat surface and production-readiness P0 gaps" with "Phase 4's removal of unused features and critical production-readiness gaps."

---

### Issue 12 [egm-style] - Severity: Nit

**Affected Scope:** [Line 111](docs/designs/ngo-os-feature-inventory.md#L111-L111) (Alternatives Considered D)

**Discrepancy Description:** "Near-zero marginal cost per change." `marginal cost` is economics jargon; `near-zero` is vague.

**Rationale:** Economics jargon that external readers may not know.

***AI Suggestion:*** DECLINE

***Justification:*** Nit-level issue; no change required.

---

### Issue 13 [egm-style] - Severity: Nit

**Affected Scope:** [Lines 11, 26](docs/designs/ngo-os-feature-inventory.md#L11-L26)

**Discrepancy Description:** "code is the single source of truth" used twice as an industry buzzphrase.

**Rationale:** Industry buzzphrase repeated twice. It is a specific concept but is used decoratively both times.

***AI Suggestion:*** PROPOSE FIX

***Justification:*** Simple replacement that improves precision; keeps the concept once, defined plainly.

***Proposed Edit:***
* Location: Lines 11 and 26
* Change: Keep one occurrence as "code is the one authoritative record" or "one place that is always correct." Remove the second occurrence or rephrase.

---

## Resolution Summary

| Category | Count |
|----------|-------|
| PROPOSE FIX | 9 |
| CONTEST | 0 |
| ESCALATE | 0 |
| DECLINE | 4 |

No findings require escalation (no evidence outside the reviewer's reach).
