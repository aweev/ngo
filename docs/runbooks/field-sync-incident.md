# Field Sync Incident Runbook

**Audience:** On-call engineer, field operations lead
**SLA:** <4h response during active field operations, <24h otherwise
**Decision Reference:** 2026-10-11 — Funded support retainer for field sync incidents

---

## 1. Triage (First 15 Minutes)

### 1.1 Identify Scope
| Symptom | Likely Cause | Check |
|---------|--------------|-------|
| All devices stuck syncing | Server-side `pushFieldBatch` failing | Supabase logs → `field-sync` action errors |
| One device stuck syncing | Local IndexedDB corruption / clock drift | Device logs, `localStorage` inspection |
| Sync succeeds but data missing | Duplicate detection flagging as "duplicate" | `sync_conflicts` table, notices in field UI |
| "Terminal" items growing | 8 failed attempts without resolution | `field_db.outbox` where `attempts >= 8` |
| Conflict count rising | Concurrent edits offline | `sync_conflicts` table `status='open'` |

### 1.2 Immediate Checks
```bash
# Check Supabase function logs
supabase functions logs cron-runner --follow

# Check field-sync action errors (last 1h)
supabase logs --grep "field-sync" --since "1 hour ago"

# Check outbox health (run in Supabase SQL editor)
SELECT count(*) as pending, 
       count(*) filter (where attempts >= 8) as terminal,
       max(created_at) as oldest_pending
FROM field_db.outbox;
```

### 1.3 Common Causes (Ordered by Frequency)
1. **Clock drift on device** → `base_updated_at` stale → conflicts
2. **Schema migration applied** → client has old types → validation errors
3. **Supabase project paused/quota exceeded** → 5xx from edge functions
4. **ENCRYPTION_KEY rotation** → decrypt fails → "error" status
5. **Network partition** → partial batch acknowledged → orphaned items

---

## 2. Resolution Procedures

### 2.1 Clock Drift / Stale `base_updated_at`
**Symptoms:** Many "conflict" status, `sync_conflicts` growing
**Fix:**
1. Device must come online → `pullFieldUpdates(since)` fetches fresh `updated_at`
2. User resolves conflicts in UI (`resolveSyncConflict`)
3. If urgent: admin runs `resolveSyncConflict` with `'server'` for specific IDs

### 2.2 Schema Migration Drift
**Symptoms:** "error" status with validation messages, `pushFieldBatch` returns 400
**Fix:**
1. Verify client has latest JS bundle (PWA cache may serve old version)
2. Force reload: `navigator.serviceWorker.getRegistration().then(r => r.update())`
3. If breaking change: deploy backward-compatible migration first, then client

### 2.3 Supabase Quota / Pausing
**Symptoms:** 503/504 from `pushFieldBatch`, `cron-runner` logs show failures
**Fix:**
1. Check Supabase dashboard → Database → Usage
2. If paused: resume project (billing issue)
3. If quota: upgrade plan or reduce batch size temporarily (max 25 → 10)

### 2.4 ENCRYPTION_KEY Rotation Gone Wrong
**Symptoms:** Decrypt failures in `pullFieldUpdates`, "error" on sync
**Fix:**
1. **NEVER rotate ENCRYPTION_KEY without re-encryption migration**
2. If rotated: restore old key immediately, plan re-encryption (Phase 3 envelope encryption)
3. Affected devices: clear IndexedDB (`localStorage.clear()`, `indexedDB.deleteDatabase('ngo-field-db')`), re-register

### 2.5 Terminal Items (8+ Attempts)
**Symptoms:** `terminalCount` growing in field UI, notices not clearing
**Fix:**
1. Query terminal items:
```sql
SELECT offline_uuid, kind, payload, attempts, last_error
FROM field_db.outbox
WHERE attempts >= 8;
```
2. For each: determine root cause (permission? validation? duplicate?)
3. Fix root cause → `markOpFailed(op.offline_uuid, null)` resets attempts
4. Or: admin creates record manually → `removeFieldOps([uuid])` clears outbox

---

## 3. Escalation Matrix

| Tier | Trigger | Action | Owner |
|------|---------|--------|-------|
| 1 | Single device stuck >30min | Remote debug via screen share | On-call engineer |
| 2 | >5 devices affected OR >100 terminal items | Page on-call + field ops lead | On-call engineer |
| 3 | Supabase outage OR data corruption risk | Page CTO + DPO | On-call engineer |
| 4 | Beneficiary PII exposure suspected | Invoke breach procedure | DPO + CTO |

---

## 4. Communication Templates

### 4.1 Field Team Notification (Slack/WhatsApp)
```
🚨 FIELD SYNC ISSUE DETECTED
Scope: [All devices / Region X / Device ID: xxx]
Symptom: [Sync failing / Data missing / Conflicts rising]
Status: [Investigating / Fix deployed / Resolved]
ETA: [Time]
Action needed: [None / Force app reload / Visit admin panel]
Contact: [On-call name + phone]
```

### 4.2 Post-Incident Report (Within 24h)
- **What happened** (timeline)
- **Root cause** (5 whys)
- **Impact** (devices affected, data loss risk, field ops delayed)
- **Fix applied** (code/config/infra)
- **Prevention** (monitoring alert, runbook update, architecture change)

---

## 5. Monitoring & Alerting (Pre-Requisites)

### 5.1 Required Metrics (Must Exist Before Field Deployment)
| Metric | Query | Alert Threshold |
|--------|-------|-----------------|
| `field_sync_pending` | `count(outbox)` | >50 for 10min |
| `field_sync_terminal` | `count(outbox) filter(attempts>=8)` | ≥1 |
| `field_sync_conflicts_open` | `count(sync_conflicts) filter(status='open')` | >20 |
| `field_sync_duration_p95` | `histogram(pushFieldBatch duration)` | >30s |
| `field_devices_active` | `distinct(device_id) from outbox where created_at > 24h` | Drop >50% |

### 5.2 Required Dashboards
- **Field Sync Health** (Grafana/Supabase charts): pending, terminal, conflicts, success rate
- **Device Fleet**: last seen, sync count, error rate per device_id
- **Org-Level**: per-organization sync health (multi-tenant)

---

## 6. Prevention Checklist (Per Release)

- [ ] `pushFieldBatch` integration test passes (CI)
- [ ] `pullFieldUpdates` round-trip test with conflicts
- [ ] Schema migration backward compatibility verified (`verify:migrations`)
- [ ] ENCRYPTION_KEY unchanged (or re-encryption migration tested)
- [ ] PWA cache version bumped if field components changed
- [ ] Field device smoke test: register → offline 1h → sync → verify
- [ ] On-call has physical access to test device

---

## 7. Contacts

| Role | Name | Phone | Slack | Backup |
|------|------|-------|-------|--------|
| On-Call Engineer | [TBD] | [TBD] | @oncall | [TBD] |
| Field Ops Lead | [TBD] | [TBD] | @field-ops | [TBD] |
| CTO | [TBD] | [TBD] | @cto | [TBD] |
| DPO | [TBD] | [TBD] | @dpo | [TBD] |
| Supabase Support | — | — | Dashboard ticket | — |

---

## 8. Related Documents

- `docs/06-field-operations.md` — Field app architecture
- `docs/04-security-and-privacy.md` — PII encryption, consent
- `docs/02-architecture.md` §Offline sync protocol
- `docs/09-operations.md` — General operations
- `supabase/functions/cron-runner/` — Cron runner that drains outbox