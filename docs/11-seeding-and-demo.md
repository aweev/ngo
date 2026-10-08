# 11 — Seeding & Demo

## Scripts (`package.json`)

| Script | Command | Purpose |
|---|---|---|
| `seed:personas` | `node scripts/seed-personas.mjs --confirm [--org <id>] [--domain awe.local]` | 4 staff users (owner/admin/manager/member, password `AweLocal123!`), bootstraps org |
| `seed:master` | `node scripts/seed-master.mjs --confirm [--org <id>]` | Full coherent demo dataset (this guide) |

Both are idempotent (natural-key matching, fills gaps only), require
`--confirm`, need `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in
`.env.local`, and must run where the database is reachable (no
seed-from-offline-sandbox: DNS/egress to Supabase is required).

## PII key discipline

Seeded names/phones are real AES-GCM ciphertext. The script prints a key
fingerprint — the app must run with the same `ENCRYPTION_KEY` or seeded
names will not decrypt. Without a key, seed and app (dev) share the
documented dev fallback consistently. For anything beyond local demo: set a
32+ char key first, then seed. All people are fictional (`(demo)` suffix,
reserved 0700-000 phone range). The byte contract is pinned by
`src/lib/field-crypto-contract.test.ts`.

## Master dataset (one story, every surface lit)

- **Programs**: Clean Water Kakamega (WASH/active), Healthy Start Clinics
  (health/active), Girls Learn Pilot (education/planning).
- **Finance**: 3 funds, 2 grants with allowable-cost terms + dated reporting
  obligations, 6 donations (one USD), 3 budgets + 7 lines, 7 expenses covering
  pending / first-of-two / approved / paid / rejected, an overspent Travel
  line, a missing receipt, a USD expense, cost splits, 2 FX rates.
- **Field**: 3 households, 8 beneficiaries, 10 services, 2 referrals.
- **M&E**: 3 metrics (2 public), measurements, 1 goal, approved sender +
  quarantined and reviewable field reports.
- **People**: 3 workers (linked to personas when present), 4 volunteers +
  hours, 2 partners. **Public**: published hero/mission/get-involved,
  testimonials, story, news, team, milestones. **Reporting**: "Donor expense
  report" definition ready to run.

## 20-minute demo walkthrough

1. **Public home** — hero, metrics, testimonials render from CMS + aggregates.
2. **`/field`** — search a beneficiary, log a service (3 taps), open Sync
   (empty queue), toggle airplane mode, register a household offline, sync.
3. **`/admin/financial`** — approve the pending expense; open the 1,200
   refrigeration expense (awaits a *second, different* approver — switch
   users to complete it).
4. **`/admin/financial/reconcile`** — overspent Travel badge, missing
   receipt, USD→EUR conversion, add a rate, set the threshold.
5. **`/admin/donors/<Europa Aid>`** — donations, 2 linked grants, deadlines.
6. **`/admin/impact`** — promote the reviewable field report into a
   measurement; reject the quarantined one with a reason.
7. **`/admin/reporting`** — run "Donor expense report", export CSV, download
   the IATI file and read its omission warnings aloud (the honesty feature).
