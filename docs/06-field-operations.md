# 06 — Field Operations Manual

Reader: field officers, volunteer coordinators, program managers. The field
app lives at `/field` (5 destinations max, works in English, French, and
Arabic today — Swahili and Hausa catalogs are on the roadmap and fall back
to English until they land). No training manual needed beyond this page.

## First visit (online, once)

1. Sign in. Open **Field** (sidebar) or go to `/field`.
2. Visit each screen once (Home, Register, Beneficiaries, Sync, Help). This
   caches the app on the device for offline use.
3. The header pill shows green **Sync** (nothing waiting) or an amber count.

Tip for shared phones: the queue lives on the device, not in your account —
anyone signed in on this phone can push what you queued. Sign out once your
queue is empty.

## Register a household (under 2 minutes, 7 taps)

Home → **Register household**:

1. **Step 1** — head-of-household name, village/area, and the **consent
   checkbox** (required: nothing saves without recorded consent).
2. **Step 2** — members: name, sex, age group, optional phone. Add as many as
   needed; remove mistakes with one tap.
3. **Step 3** — review. If online, the app checks for possible duplicates:
   tap **Use existing** to adopt a matched record (the row is dropped from
   your batch), or **Create new anyway**. Offline, this check happens
   automatically at sync and flags the record for review instead of blocking.
4. **Save on this device.** The record is saved on this device only — sync
   happens when you tap **Sync now** or save another record while online;
   it does not fire automatically when signal returns. Until it syncs, the
   only copy is this phone. If the app crashes mid-entry, the draft restores
   on reopen.

Rules the app enforces: names need 2+ characters; phones stay optional;
consent is mandatory; nothing identifiable is ever stored in cleartext.

## Log a service (3 taps)

Beneficiaries → tap the person → tap a service chip (Food, Water, Shelter,
Health, Education, Cash, Protection, Other) → set quantity → **Log service**.
Double-taps and offline replays are safe: every log carries an idempotency
key, so a retry never creates a second record. An **Undo-style correction**
goes through the program manager (services are evidence, not drafts).

## Referrals

On the beneficiary page: **Refer** → destination → reason → optional
follow-up date → **Create referral**. Open referrals appear with their
follow-up dates; status moves open → accepted → completed (or closed /
expired) via `updateReferralStatus`. The reconcile-style discipline applies:
a referral is only "done" when marked complete, not when created.

## Sync screen (the source of truth on-device)

- **Big number** = records waiting on this device. **Sync now** pushes them.
- **Last sync** timestamp; **Nothing waiting** means everything was
  acknowledged by the server.
- **Duplicates to merge**: records that matched an existing person. A manager
  merges them (services and referrals move to the kept record; the duplicate
  is archived with a full audit trail).
- **Sync conflicts**: conflict rows appear here when the server flags one
  during reconciliation (for example an online edit that touched the same
  record). You pick keep-mine / keep-server. Note: field captures themselves
  are create-only — they never overwrite an existing record, so ordinary
  field work cannot create a conflict.
- **Needs your review**: items rejected 8 times with the server's reason.
  They are never auto-deleted. On the sync screen you can retry a record
  immediately, or discard it after typing DELETE to confirm — a record only
  leaves the device through one of those two actions.
- **Per-officer queue**: records you queue are stamped with your account and
  are only sent from your sign-in. On a shared phone, another officer's
  queued records show as locked with a count — sign in as them to send.
- **Backup**: the queue can be exported as a JSON file at any time. Records
  exist only on this device until they sync, so export before wiping or
  handing in a phone.
- Offline banner state: "You are offline. Records stay on this device." If an
  uncached page is opened offline, a dedicated offline screen explains records
  are saved on-device and need a manual Sync, with a retry button.

## Duplicate discipline (for program managers)

Same blind name hash, or same household with matching sex/age profile, raises
a candidate — never an auto-merge. `mergeBeneficiaries(keep, dupe)` moves
services + referrals, archives the dupe, writes `beneficiary.merged`. Merge
rates above ~2% signal a registration-training issue, not a software issue.

## Verification queue (M&E / program manager)

WhatsApp/SMS intake (`/api/webhooks/whatsapp`, approved senders only) and
ambiguous traffic land in `field_reports` as **quarantined**. Review flow in
`/admin/impact` (or the field-reports actions):

1. `quarantined` → `pending_review` (assign the metric) → `verified`, or
   `rejected` with a reason.
2. `promoteFieldReport()` mints the measurement — the ONLY path from a raw
   report to an indicator, idempotent on retry.
3. Unreadable messages stay quarantined raw (no guessed numbers); unknown
   senders are logged, never attributed.

Only verified/promoted numbers reach donor reports and the public dashboard.

## What the field app does NOT do

- No photos offline (evidence uploads when online through the scanned
  trust-documents pipeline).
- No editing someone else's queue, no deleting synced services, no
  exporting data from the device.
- Lost/stolen phone: report immediately so the account can be frozen;
  remote wipe is on the roadmap (see `12-roadmap.md`). **Until a record
  syncs, it exists only on the phone** — if the device is lost before
  syncing, unsent records are gone. Sync before you leave the field, and
  treat a lost device as holding undecrypted PII only if the officer was
  signed in with cached data — IndexedDB contents are the exposure surface.
