# Intermediate Zoom Out Report — Stage 8

**Target:** `docs/designs/ngo-os-feature-inventory.md` (full file, 169 lines)
**Reviewer:** egm-zoom-out
**Context:** Stage 5 findings from `zoom_out_report.md`
**Date:** 2026-11-11

---

## Finding 1 — 🟡 Major — Risks & Mitigations omits key Stage 5 failure modes

**Affected scope:** Lines 115–130 (Risks & Mitigations section)

**Discrepancy:** The new Risks & Mitigations section covers 5 risks (CI drift false positives, generator correctness, security, scalability, dead-code removal risk) but does **not** address several failure modes flagged as Blockers/Majors in Stage 5:
- Maturity tagging as subjective human judgment (Blocker — egm-inventive-catalyst Finding 2)
- Circular dependency: docs supersession status as generator input (Major — Finding 4)
- Governance / named owner absence (Major — Finding 6)
- Archive deprecation without sunset clause (Major — Finding 5)
- i18n coverage misses named production gaps (Arabic RTL, hardcoded en-US formatting) (Nit — Finding 8)

**Rationale:** Stage 5's core contradiction was "code is single source of truth vs. human judgment labels maturity, supersedes docs, owns governance, and unblocks CI." The Risks & Mitigations section was the natural place to record mitigations for these, yet 5 of the 8 Stage 5 findings have no corresponding risk entry. The section reads as a generic risk list rather than a targeted response to the Comprehension/Critic findings.

**Suggested resolution:** Add risk entries for: (a) subjective maturity labels — mitigation: derive maturity algorithmically from observable signals or mark as explicitly manual/editorial; (b) circular docs-as-input — mitigation: docs are outputs, never inputs; supersession status from ADR frontmatter or a machine-readable registry; (c) governance — mitigation: named owner or auto-commit bot for steady-state sync; (d) archive sunset — mitigation: sunsetDate with CI fail-after-sunset or relocation to git-lfs/history repo; (e) i18n named gaps — mitigation: extend static checks for RTL markers and hardcoded formatting, or mark as `not assessed`.

---

## Finding 2 — 🟡 Major — Maturity/status label changes inconsistently applied (FeatureRange)

**Affected scope:** Line 28; Line 55; Line 146 (tagging / FeatureRange)

**Discrepancy:** The mandated label migration (`half-baked`/`bloated`/`high-potential` → `partial`/`unused`/`planned`) is applied inconsistently:
- Line 28 (Goals): uses NEW labels — `implemented`, `partial`, `unused`, `planned` ✓
- Line 55 (Technical Plan item 4): MIXED — new maturity labels (`partial`, `unused`, `planned`) but OLD status labels (`deprecated`, `planned-for-deletion`, `deleted`) ✗
- Line 146 (Detailed Implementation Plan): ALL OLD labels — maturity `implemented`/`half-baked`/`bloated`/`high-potential`, status `implemented`/`deprecated`/`planned-for-deletion`/`deleted` ✗

**Rationale:** The same classification system is described in three places with three different label sets. Line 146 directly contradicts line 28, and line 55 is internally inconsistent (new maturity, old status). This undermines the "code-verified inventory" premise — readers cannot tell which label set is authoritative.

**Suggested resolution:** Standardize on the new labels across all three locations. Line 55 should drop `deprecated`/`planned-for-deletion`/`deleted` in favor of `unused`/`planned`. Line 146 should replace `half-baked`/`bloated`/`high-potential` with `partial`/`unused`/`planned`, and `deprecated`/`planned-for-deletion`/`deleted` with `unused`/`planned`. Add a single authoritative definition table if needed.

---

## Finding 3 — 🟡 Major — Buzzword removals not applied

**Affected scope:** Lines 11, 19, 36, 49, 101, 111

**Discrepancy:** None of the mandated buzzword removals were applied. All six buzzwords remain:
- `single source of truth` — line 11 (twice)
- `consumable` — lines 19 ("consumable map"), 49 ("consumable artifact"), 101 ("consumable, versioned artifact"), 111 ("consumable by auditors")
- `P0` — line 36 ("P0 production-readiness gaps")

(`full-fledged`, `plug in`, `cut-the-bloat` do not appear, so those were either never present or already removed.)

**Rationale:** The buzzword list was specified for removal in FeatureRange. Their continued presence contradicts the edit mandate and introduces vague, marketing-style language into a design document that claims to be code-verified and precise.

**Suggested resolution:** Remove/replace all six buzzwords:
- "single source of truth" → "authoritative record" or "single authoritative record"
- "consumable" → "navigable", "structured", "versioned", or "machine-readable"
- "P0" → "critical", "production-readiness", or remove

---

## Finding 4 — 🟡 Major — "Decision recorded in:" links are unresolved placeholders

**Affected scope:** Lines 95, 101, 107, 113 (Alternatives Considered)

**Discrepancy:** All four alternatives now contain "decision recorded in: <link to issue/PR>" text, satisfying the structural requirement. However, every link is the literal placeholder `<link to issue/PR>` — none point to an actual issue or PR. They do not resolve.

**Rationale:** A "Decision recorded in:" link that points to a placeholder is worse than no link at all: it creates the false impression of traceability while providing none. Auditors and reviewers cannot verify the decision context.

**Suggested resolution:** Replace each `<link to issue/PR>` with an actual URL to the corresponding issue/PR, or remove the phrase if no decision record exists yet.

---

## Finding 5 — 🟢 Nit — "cannot drift by construction" claim still unsubstantiated

**Affected scope:** Line 111 (Alternative D Pros); also line 51 and line 147

**Discrepancy:** The claim that the manifest "cannot drift by construction" (line 111) and "cannot drift from code by construction" (line 51) remains, despite the Stage 5 findings that subjective maturity labels and docs-as-inputs make drift inevitable by design. Finding 1 notes maturity labeling is unaddressed; Finding 2 notes label inconsistency.

**Rationale:** The claim is only true if *every* input is code-derived and deterministic. Subjective maturity labels, manual overrides, and docs supersession status (still listed as a generator input on line 145) all reintroduce drift potential. The claim overstates the guarantee.

**Suggested resolution:** Qualify the claim: "cannot drift from code-derived data by construction" or "auto-generated portions cannot drift; manually assigned labels require separate review." Alternatively, address the root causes (Findings 1 and 2) so the claim becomes accurate.

---

## Finding 6 — 🟢 Nit — Cross-references resolve, but one path is fragile

**Affected scope:** Line 15 (`../../README.md`, `../../ARCHITECTURAL_REVIEW.md`)

**Discrepancy:** All five cross-referenced files exist and resolve correctly:
- `../../README.md` → root README.md ✓
- `../../ARCHITECTURAL_REVIEW.md` → root ARCHITECTURAL_REVIEW.md ✓
- `../production-readiness-notes.md` → docs/production-readiness-notes.md ✓
- `../12-roadmap.md` → docs/12-roadmap.md ✓
- `../14-architecture-decisions.md` → docs/14-architecture-decisions.md ✓

However, `../../ARCHITECTURAL_REVIEW.md` relies on a root-level file with a non-standard naming convention (all other docs are in `docs/` with numeric prefixes). This is a fragile cross-reference.

**Rationale:** While technically resolving today, the cross-reference couples the design doc to a root-level file that may be moved or renamed, breaking the link. The other references are within `docs/` and more stable.

**Suggested resolution:** Consider moving the reference to a stable `docs/` path if the file is relocated, or keep as-is since it currently resolves. Low priority.

---

## Finding 7 — 🟢 Nit — "17 verification scripts" count still inaccurate

**Affected scope:** Lines 11, 19, 49, 85

**Discrepancy:** The document repeatedly cites "17 verification scripts." The `scripts/` directory contains 12 verify scripts total (11 `.mjs` + 1 `.ps1`): `verify-action-auth`, `verify-cta-links`, `verify-db-projections`, `verify-functions`, `verify-i18n`, `verify-i18n-hardcoded`, `verify-i18n-usage`, `verify-licenses`, `verify-migrations` (`.mjs` and `.ps1`), `verify-reliability`, `verify-rls-isolation`. This was a Stage 5 nit that was not corrected.

**Rationale:** The document's premise is code-verified accuracy; an unverified script count undermines credibility and suggests inventory inputs have not been reconciled with code.

**Suggested resolution:** Count the actual `verify-*` files in `scripts/` and update the document to "12 verification scripts" (or source the count programmatically from the generator).

---

## Summary

| # | Severity | Finding |
|---|----------|---------|
| 1 | 🟡 Major | Risks & Mitigations omits 5 of 8 Stage 5 failure modes (maturity subjectivity, circular docs input, governance, archive sunset, i18n gaps) |
| 2 | 🟡 Major | Maturity/status labels inconsistently applied: line 28 (new), line 55 (mixed), line 146 (all old) |
| 3 | 🟡 Major | Buzzwords not removed: `single source of truth` (line 11), `consumable` (lines 19/49/101/111), `P0` (line 36) |
| 4 | 🟡 Major | "Decision recorded in:" links are `<link to issue/PR>` placeholders — do not resolve |
| 5 | 🟢 Nit | "cannot drift by construction" claim still unsubstantiated |
| 6 | 🟢 Nit | `../../ARCHITECTURAL_REVIEW.md` cross-reference is fragile (root-level, non-standard naming) |
| 7 | 🟢 Nit | "17 verification scripts" count inaccurate (actual: 12) |

**Most critical gaps to address before Stage 9:** Finding 1 (unmitigated Blockers/Majors from Stage 5), Finding 2 (label inconsistency in FeatureRange), Finding 3 (buzzwords not removed), Finding 4 (unresolved decision links).
