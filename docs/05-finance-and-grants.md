# 05 — Finance & Grants

Reader: finance officers, auditors, fundraisers. All money paths are
action-traced in `actions/financial.ts`, `actions/fx.ts`,
`actions/reconciliation.ts`, `actions/trust.ts`, enforced by triggers in
`20260926000001_phase0_finance_truth.sql`.

## Chart of records (how money is organized)

```
Donor ──pledge/donation──▶ donations (one_time/recurring/in_kind/legacy)
Donor ──grant agreement──▶ grants ──▶ funds (restricted buckets)
Funds ──▶ budgets ──▶ budget_lines ──▶ expenses (the spend)
Expenses ──cost_allocations──▶ grants (which grant paid which share)
```

- **Funds** (`unrestricted` / `temporarily_restricted` /
  `permanently_restricted`) are the restriction buckets. A restricted fund
  may only be spent on its purpose.
- **Grants** carry the donor terms: `amount_committed`, `allowable_costs`
  (`{categories[], max_per_expense}`), `indirect_cost_rate`, and
  `reporting_requirements` (dated obligations surfaced as donor deadlines).
- **Budgets → lines → expenses** is the operational spend chain.
  `spent_amount` on lines is trigger-maintained from approved/paid expenses —
  never hand-edited.

## Expense lifecycle

`pending` → (`approved_first` →) `approved` → `paid`, with `rejected` as a
terminal branch from pending states.

| Rule | Where |
|---|---|
| Always starts `pending`, `submitted_by` = creator | `createExpense` |
| No self-approval, ever | `approveExpense` guard |
| Budget `status` changes require `finance.approve` | `updateBudget` gate |
| Above `organizations.expense_approval_threshold`: two different approvers (`approved_first` → `approved`) | `approveExpense` + `expense_approvals` trail |
| Allowable-cost check against every grant behind the linked fund (category + per-expense cap) | `approveExpense`, error names the blocking term |
| `approved_at` stamped on final approval only | `approveExpense` |
| Every decision (approve/reject, step 1/2, reason) recorded | `expense_approvals` |
| Approval UI shows grant-term blocks inline with reasons | `expense-forms.tsx` |

Set the threshold in `/admin/financial/reconcile` (finance settings). Empty =
single approval. Threshold changes are audit-logged.

## Currency truth

- One reporting currency per org: `organizations.default_currency`.
- Linked rows must match (expense ↔ line ↔ budget ↔ fund) via DB triggers;
  unlinked rows must match the org default. Mixed-currency inserts fail loudly
  instead of silently corrupting reports.
- Conversion happens only through dated `exchange_rates` rows (corrections
  are new rows; history is immutable). `getReconciliation()` converts into the
  org currency and lists unrated pairs under "missing rates" — amounts without
  a rate show native-only, never guessed.
- Manage rates in `/admin/financial/reconcile` (`setExchangeRate` upserts one
  dated pair; same pair+date replaces the row).

## Cost allocation

`allocateExpenseCost(expense, shares[])`: shares must sum **exactly** to the
expense amount (tolerance 0.005) and every grant must use the expense
currency. Re-saving replaces prior splits. Used for shared costs (e.g.
logistics across two grants) with `direct`/`indirect` basis. Indirect-rate
auto-suggestion from `grants.indirect_cost_rate` is a documented Phase 3
improvement; today the finance officer enters the split.

## Reconciliation (the monthly close screen)

`/admin/financial/reconcile` (`getReconciliation`, read-only
`finance.read`) shows in one place:

1. Budget lines: allocated vs spent (native + org-currency) vs remaining,
   with overspend badges.
2. Grants: committed vs spent vs remaining, plus allocated-via-splits.
3. Attention lists: awaiting approval, approved spend without a fund,
   missing receipts.
4. Missing FX rates.
5. Finance settings + rate table.

Close checklist: awaiting = 0 (or explained), unlinked = 0, receipts
complete, no missing rates, no overspend without a documented decision.

## Grant balance integrity

`getGrantBalanceReport` reads **only** `grants + funds + approved/paid
expenses`: committed minus spend per grant, fund-type mapped from the real
`funds` row (temporarily→restricted, permanently→endowment). Grants without a
linked fund default to unrestricted **visibly**, so finance links them. There
are no synthesized funders, codes, or types anywhere in the money path — a
prior version fabricated them and was deleted in Phase 0.

## Donor reporting (fundraiser flow, 5 steps)

Donor → period + grant → run report (snapshot + `query_hash`) → export CSV
(same fetch path, cannot disagree) → attach with the hash as provenance.
`runReport` paginates to 5000 rows, applies the definition's eq-filters and
sorting (unknown columns degrade to unordered, never fail). Snapshots store
rows + hash; exports are audited (`reporting.csv_exported`).

## IATI export (institutional donors)

`generateIATIXmlExport` maps real rows only: project statuses
(planning→1, active/paused→2, completed→3, cancelled→5), real
currency/budget/dates, DAC sectors from an explicit 9-entry category map,
funders traced project→budgets→fund→grants. Anything unmapped is **omitted
with a warning**, never invented (sector, funder, description nodes are
optional in `lib/iati-export.ts`). The UI surfaces the first warnings so the
fundraiser knows exactly what was left out and why.

## Donor 360° (`/admin/donors/[id]`)

Commitments (donations, per-currency totals that never mix currencies),
linked institutional grants (`linkGrantDonor`, finance.manage, same-org
checked), and deadlines parsed defensively from `reporting_requirements`
(overdue vs upcoming badges; unparseable values ignored, never guessed).
