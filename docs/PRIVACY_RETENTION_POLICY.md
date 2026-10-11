# Privacy & Data Retention Policy — AWE e.V. NGO OS

**Version:** 1.0  
**Effective Date:** 2026-10-10  
**Data Protection Officer:** privacy@awe-ev.org  
**Legal Basis:** GDPR Art. 6, 9, 30, 32; BDSG; German Non-Profit Law

---

## 1. Data Categories & Retention Periods

| Data Category | Description | Retention Period | Legal Basis | Deletion Method |
|--------------|-------------|------------------|-------------|-----------------|
| **Newsletter Subscribers** | Email, locale, subscription status, source, timestamps | 2 years after unsubscribe / bounce | GDPR Art. 6(1)(a) Consent | Soft delete → anonymize after 30 days |
| **Contact Form Submissions** | Name, email, topic, message, consent, locale | 3 years after resolution | GDPR Art. 6(1)(f) Legitimate interest | Hard delete |
| **Safeguarding Reports** | Anonymous or identified reports, category, message | 7 years (legal hold) | GDPR Art. 6(1)(c) Legal obligation; Art. 9(2)(g) Substantial public interest | Encrypted archive; access-controlled |
| **Corporate Inquiries** | Company, contact person, email, industry, budget, goals | 3 years after last contact | GDPR Art. 6(1)(f) Legitimate interest | Hard delete |
| **Donation Records** | Amount, currency, type, email, receipt status, timestamps | 10 years (fiscal law) | German Fiscal Code (AO) §147; GDPR Art. 6(1)(c) | Pseudonymize after 10 years; retain transaction hash |
| **Tax Receipts (Zuwendungsbestätigungen)** | Donor name, amount, date, tax ID, receipt number | 10 years + current year | German Fiscal Code (AO) §147; EStG §50 | Archive; no deletion |
| **Volunteer Applications** | Name, contact, role preferences, availability, skills | 3 years after inactivity | GDPR Art. 6(1)(b) Pre-contractual | Anonymize for statistics |
| **Beneficiary Data (Field App)** | Household data, services, referrals, location | 5 years after last service | GDPR Art. 6(1)(e) Public task; Art. 9(2)(h) Health/social care | Encrypt at rest; delete after retention |
| **Staff/HR Records** | Employment contracts, payroll, performance, offboarding | 10 years after termination | German labor law; GDPR Art. 6(1)(c) | Archive; restricted access |
| **Grant & Financial Documents** | Proposals, budgets, reports, audits, compliance | 10 years after grant closure | Grant agreements; GDPR Art. 6(1)(c) | Archive |
| **Audit Logs (audit_events)** | All system actions, user ID, timestamp, resource | 7 years | GDPR Art. 5(2) Accountability; Art. 32 | Immutable append-only; purge after 7 years |
| **Web Analytics (Plausible/Matomo)** | Anonymous page views, referrers, country | 13 months | GDPR Art. 6(1)(a) Consent | Auto-expiry |
| **Error/Performance Logs** | Stack traces, request IDs, timestamps | 90 days | GDPR Art. 6(1)(f) Security | Auto-purge |
| **Media Uploads** | Images, videos, documents with metadata | Per associated record | GDPR Art. 6(1)(b)/(f) | Delete with parent record |

---

## 2. Data Subject Rights (DSAR) Process

### 2.1 Request Channels
- **Email:** privacy@awe-ev.org
- **Web Form:** /contact (select "Data Protection")
- **Postal:** AWE e.V., Datenschutz, Musterstraße 123, 10115 Berlin

### 2.2 Response Timeline
- **Acknowledgment:** Within 48 hours
- **Substantive Response:** Within 30 days (extendable by 60 days for complex cases)

### 2.3 Rights Supported
| Right | Implementation |
|-------|----------------|
| Access (Art. 15) | Self-service dashboard + manual export (JSON/PDF) |
| Rectification (Art. 16) | Profile edit + admin correction workflow |
| Erasure (Art. 17) | "Right to be Forgotten" — cascade delete with legal hold checks |
| Restriction (Art. 18) | Processing freeze flag on records |
| Portability (Art. 20) | JSON export via dashboard |
| Objection (Art. 21) | Marketing opt-out + profiling objection |

### 2.4 Identity Verification
- Email confirmation link (for newsletter/contact)
- Signed request + ID copy (for beneficiary/staff data)
- Org admin approval (for tenant-scoped data)

---

## 3. Technical Safeguards (GDPR Art. 32)

| Control | Implementation |
|---------|----------------|
| **Encryption at Rest** | AES-256-GCM for PII columns (see `encrypted_columns` migration) |
| **Encryption in Transit** | TLS 1.3 everywhere (Cloudflare + Supabase) |
| **Pseudonymization** | Blind indexes for searchable encrypted fields |
| **Access Control** | RLS + custom RBAC + MFA for admin |
| **Minimization** | Column-level GRANTs; no SELECT * in public actions |
| **Integrity** | Trigger-based rollups; idempotent sync; audit log |
| **Availability** | PITR (7 days); multi-AZ Supabase; offline-first field app |
| **Resilience** | Outbox pattern; dead-letter queues; circuit breakers |

---

## 4. Third-Party Processors (Data Processing Agreements in Place)

| Processor | Purpose | Location | DPA Status |
|-----------|---------|----------|------------|
| **Supabase** | Database, Auth, Storage, Edge Functions | EU (Frankfurt) | ✅ Signed |
| **Vercel** | Hosting, Edge Network, Analytics | EU (Frankfurt) | ✅ Signed |
| **Resend** | Transactional Email | EU (via AWS Frankfurt) | ✅ Signed |
| **Stripe** | Payment Processing | EU (Ireland) | ✅ Signed |
| **Plausible/Matomo** | Privacy-first Analytics | EU (Germany) | ✅ Signed |
| **Cloudflare** | CDN, WAF, Turnstile | Global (EU edge) | ✅ Signed |

**No data transfers to non-adequate countries without SCCs.**

---

## 5. Breach Notification Procedure (GDPR Art. 33, 34)

1. **Detection** — Automated alerts (Sentry, Supabase logs, audit_events anomalies)
2. **Assessment** — DPO + Security Lead within 4 hours
3. **Containment** — Revoke tokens, rotate keys, isolate affected tables
4. **Notification to Authority** — Within 72 hours (Berliner Beauftragte für Datenschutz)
5. **Notification to Subjects** — If high risk, within 48 hours of assessment
6. **Documentation** — Incident report in `audit_events` + internal tracker
7. **Post-Incident** — Root cause analysis within 14 days; update controls

---

## 6. Data Protection Impact Assessment (DPIA)

**Required for:** Beneficiary field data (health/social care), biometric (none), systematic monitoring (analytics), large-scale sensitive data.

**Status:** Completed 2026-09-15; reviewed annually.

**Key Mitigations:**
- Field app: offline-first, no cloud sync without explicit action
- Beneficiary names encrypted; search via blind index only
- Consent gate on every story/testimonial publication
- Anonymized analytics by default

---

## 7. Records of Processing Activities (ROPA) — Art. 30

Maintained in: `/docs/ropa.csv` (machine-readable) + Notion workspace.

**Updated:** Quarterly by DPO; triggered by new feature launches.

---

## 8. Consent Management

| Consent Type | Granularity | Withdrawal | Record |
|--------------|-------------|------------|--------|
| Newsletter | Per-topic (impact, events, finance) | Footer unsubscribe link | `newsletter_subscribers` table |
| Story Publication | Per-story, per-media-type | Author dashboard | `content_page_translations` consent_gate |
| Analytics | Essential vs. Marketing | Cookie banner | Plausible/Matomo config |
| Cookies | Necessary / Preferences / Statistics / Marketing | Cookie banner | `cookie_consent` localStorage + server log |

---

## 9. International Data Transfers

- **Standard:** All processors EU-hosted
- **Exception:** Stripe (US parent) — covered by EU Standard Contractual Clauses + UK Addendum
- **No** reliance on Privacy Shield (invalidated)

---

## 10. Children's Data (GDPR Art. 8)

- **No direct collection** from children under 16
- Beneficiary data: parental/guardian consent recorded at registration
- Age verification on volunteer sign-up (18+)

---

## 11. Automated Decision-Making (GDPR Art. 22)

- **None in production.** AI translation is assistive only (human-in-the-loop).
- No profiling with legal/significant effects.

---

## 12. Retention Schedule Enforcement

```sql
-- Example: Automated cleanup via pg_cron (runs daily)
SELECT cron.schedule(
  'daily-retention-cleanup',
  '0 3 * * *',
  $$
    -- Soft-delete expired newsletter subscribers
    UPDATE newsletter_subscribers
    SET status = 'unsubscribed', unsubscribed_at = now()
    WHERE status = 'subscribed'
      AND unsubscribed_at IS NOT NULL
      AND unsubscribed_at < now() - interval '2 years';

    -- Anonymize old contact forms
    UPDATE form_submissions
    SET submission_data = jsonb_build_object('anonymized', true)
    WHERE submitted_at < now() - interval '3 years'
      AND submission_data ? 'email';
  $$
);
```

---

## 13. Contact

**Data Protection Officer:**  
Dr. Maria Schmidt  
privacy@awe-ev.org  
+49 30 12345678

**Supervisory Authority:**  
Berliner Beauftragte für Datenschutz und Informationsfreiheit  
Friedrichstraße 219, 10969 Berlin

---

## 14. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-10-10 | DPO | Initial policy aligned with production schema |