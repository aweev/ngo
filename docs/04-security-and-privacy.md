# 04 — Security & Privacy

Owner: engineering + Data Protection Officer. Review quarterly and after any
incident (see `09-operations.md`).

## Authentication

- Supabase Auth email provider; sessions validated server-side with
  `getUser()`, never `getSession()` (`src/proxy.ts`).
- **MFA (TOTP) step-up**: users with a verified factor must reach AAL2 before
  protected zones; MFA-API errors **fail closed** to `/auth/mfa`
  (`src/proxy.ts`, `src/lib/auth/mfa.ts`). Users are never locked out —
  completing the challenge grants entry.
- `callbackUrl` values are sanitized to relative same-origin paths only.
- Users without any organization are routed to `/auth/setup`, never into
  protected zones.

## Authorization model

- Single registry: `PERMISSIONS` in `src/lib/auth/permissions.ts`
  (`<module>.<action>`). Five roles only: owner, admin (`'*'`), manager
  (operational set), member (field set: `beneficiaries.*`, `projects.read`,
  notifications/messaging/events read).
- Enforcement: `authorizePermission()` in `src/lib/auth/guards.ts` resolves
  base role + custom grants + per-user overrides (deny wins), fail-closed on
  any read error. Every server action passes it first — enforced statically by
  `verify-action-auth` (302 actions).
- Database mirror: `role_has_permission()` SQL matrix + `add_tenant_policies()`
  generator. Owner/admin bypass; manager/member lists must stay in sync with
  the TS registry when permissions are added (both were extended together in
  Phase 1 for `beneficiaries.*`).
- `assertSameOrganization` blocks cross-org writes; `trg_prevent_org_change`
  blocks org reassignment at the database level.

## Row-level security

- ENABLED on all 83 tenant tables; org-scoped policies via the generator
  (post-hardening migrations get both from the call itself).
- Static proof in CI: `verify-rls-isolation.mjs`. Live proof against a real
  DB: `supabase/tests/rls-isolation-tests.sql` via `scripts/run-rls-tests.mjs`
  (transactional, rolls back — safe on live data).
- Service-role bypass is confined to `lib/supabase/admin-client.ts`
  (webhooks, receipts, admin storage, user administration).

## Beneficiary data protection (do-no-harm core)

| Control | Implementation | Status |
|---|---|---|
| Consent capture | `recordConsent()` writes granted rows; field writes require one first (`lib/field-records.ts`) | Live |
| Minimization | No DOB (age bands), optional phone, free-text caps, photo never queued offline | Live |
| Encryption at rest | AES-256-GCM, per-org salt, key from `ENCRYPTION_KEY` (`lib/field-crypto.ts`) | Live; production refuses PII writes without a key |
| Searchable lookup | Blind-index SHA-256 hashes only (`search_hash`) | Live |
| Transport | HTTPS (HSTS preload), secure cookies via Supabase SSR | Live |
| Anonymized reporting | Aggregates + counts in public views; no PII in snapshots/exports | Live |
| Archival | `is_archived` + `deleted_at` soft delete | Live |
| Hard deletion / DSAR execution | Retention executor + subject erasure job | **Phase 3 — not built** (status flips exist; the executor does not) |
| Breach notification playbook | — | **Open: needs owner + 72h procedure** (see `12-roadmap.md` Q7) |

Key fingerprint discipline: the seed script prints the PII key fingerprint;
the app must run with the same `ENCRYPTION_KEY` or seeded names will not
decrypt. Keys are independent per deployment; the service key is never reused
as a salt (`abuse-prevention.ts`).

## File uploads

Unified pipeline (`lib/trust-documents.ts`, enforced in `actions/media.ts` +
`actions/documents.ts`): magic-byte sniffing (client MIME ignored), SVG
rejection, corrupt-image rejection, EXIF/GPS stripping for PNG/JPEG, SHA-256
checksums, sanitized storage paths, private buckets with signed URLs, and
quarantine (`scan_state='upload'`) until scanned clean. 25 MB cap.

## Abuse & rate limiting

Public intake is gated by `lib/abuse-prevention.ts`: CDN/WAF edge secret,
honeypot, Turnstile/hCaptcha verification (fail-closed when required),
salted-hash throttle identities (never raw IPs/emails), risk-scored PII-free
alerts. Distributed Postgres limiter with memory-only dev mode
(`RATE_LIMIT_MODE`).

## Device loss / theft

Session-bound offline queues (`belongsToSession`) prevent cross-user replay.
Remote wipe and session revocation UI is **Phase 3** (see `12-roadmap.md`).
Until then: rotate the user out via Supabase Auth admin (block sign-in),
which orphans their queued device data; treat the device as compromised for
any PII it may hold in IndexedDB.

## Audit & compliance mapping

- Every financial, approval, promotion, export, merge, consent-withdrawal,
  and conflict-resolution event lands in append-only `audit_events`
  (`lib/audit-events.ts`, never throws).
- Donor-audit exports: grant → expenses + receipts + approvals + audit trail
  from live data (`getReconciliation`, `exportReportCsv` with query hashes).
- GDPR/local-act alignment: consent evidence, minimization, breach-readiness
  gaps above are tracked openly; no convenience trade-offs against
  auditability are accepted (see `01-product-vision.md` constraints).

## Secrets inventory (`.env.*`)

Public: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_PHASE0_FULL_NAV` (operator
escape hatch). Server-only: `SUPABASE_SERVICE_ROLE_KEY`,
`ENCRYPTION_KEY` (32+ chars, required in prod), `ABUSE_HASH_SALT`,
`RECEIPT_HMAC_SECRET` (32+), `STRIPE_*`, `TWILIO_*`, `RESEND_*`,
captcha/edge/AI keys — all optional with honest degraded modes. Full list
with generation commands: `.env.example`.
