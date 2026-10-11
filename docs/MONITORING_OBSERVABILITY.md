# Production Monitoring & Observability — AWE e.V. NGO OS

**Version:** 1.0  
**Last Updated:** 2026-10-10

---

## 1. Monitoring Stack

| Layer | Tool | Purpose | Configuration |
|-------|------|---------|---------------|
| **Error Tracking** | Sentry (self-hosted or SaaS) | Exception capture, release tracking, breadcrumbs | DSN in `SENTRY_DSN`; sample rate 1.0 for errors, 0.1 for transactions |
| **Metrics** | Prometheus + Grafana | Infrastructure, app metrics, business KPIs | Scrape `/api/metrics` every 30s; `METRICS_TOKEN` auth |
| **Logs** | Loki + Grafana | Structured log aggregation | Tail `stdout`/`stderr`; labels: `service`, `environment`, `locale` |
| **Uptime** | UptimeRobot / Better Uptime | Synthetic checks, SSL expiry, domain health | 1-min checks on `/api/health`; 5-min on key pages |
| **Real User Monitoring** | Plausible / Matomo | Core Web Vitals, page views, conversions | Script on all public pages; GDPR-compliant |
| **Distributed Tracing** | OpenTelemetry → Tempo | Request flow across Next.js, Supabase, Edge Functions | W3C tracecontext headers; 10% sample |

---

## 2. Key Metrics & Alerts

### 2.1 Infrastructure (Prometheus)

| Metric | Alert Threshold | Severity | Runbook |
|--------|----------------|----------|---------|
| `http_requests_total{status=~"5.."}` | > 1% for 5m | Critical | `incident-runbook.md#5xx-spike` |
| `http_request_duration_seconds{quantile="0.95"}` | > 2s for 5m | Warning | `incident-runbook.md#latency` |
| `supabase_db_connections_active` | > 80% of max | Warning | `incident-runbook.md#db-connections` |
| `supabase_storage_used_bytes` | > 80% quota | Warning | `incident-runbook.md#storage` |
| `edge_function_duration_seconds` | > 30s p95 | Warning | `incident-runbook.md#edge-functions` |
| `outbox_pending_count` | > 1000 for 10m | Critical | `incident-runbook.md#outbox-backlog` |
| `sync_conflicts_total` | > 10/hour | Warning | `incident-runbook.md#sync-conflicts` |

### 2.2 Application (Custom Metrics)

| Metric | Description | Alert |
|--------|-------------|-------|
| `cms_query_duration_seconds` | Time to fetch public content | > 500ms p95 |
| `translation_failure_total` | AI translation errors | > 5/min |
| `image_load_failure_total` | Failed image loads (4xx/5xx) | > 1% |
| `form_submission_total{status="error"}` | Contact/newsletter/safeguarding errors | > 10/min |
| `donation_pledge_total{status="failed"}` | Stripe checkout failures | > 5/min |
| `newsletter_opt_in_total` | Successful subscriptions | Track only |
| `newsletter_opt_out_total` | Unsubscribes | Alert if > 5% of subs |
| `public_404_total` | 404 rate on public routes | > 5% of traffic |
| `locale_missing_translation_total` | Fallback to English | Alert if > 100/day |

### 2.3 Business KPIs (Grafana Dashboards)

- **Donations:** Volume, average, recurring rate, conversion funnel
- **Volunteers:** Sign-ups, active, hours logged, retention
- **Content:** Published pages, translation coverage, stale content (>90 days)
- **Field App:** Sync success rate, offline queue size, conflict rate
- **Compliance:** Safeguarding reports, DSAR requests, breach incidents

---

## 3. Health Checks

### 3.1 `/api/health` (Public, No Auth)

```json
{
  "status": "healthy",
  "timestamp": "2026-10-10T12:00:00Z",
  "checks": {
    "database": { "status": "up", "latency_ms": 12 },
    "supabase_auth": { "status": "up", "latency_ms": 8 },
    "storage": { "status": "up", "latency_ms": 15 },
    "edge_functions": { "status": "up", "count": 4 },
    "outbox": { "status": "up", "pending": 3 },
    "translations": { "status": "up", "queue": 0 }
  }
}
```

**SLA:** 99.9% uptime; < 200ms response

### 3.2 `/api/metrics` (Prometheus, Token-Gated)

Exposes:
- `http_requests_total` by route, method, status, locale
- `http_request_duration_seconds` histogram
- `cms_content_pages_published` gauge
- `translation_jobs_total` counter
- `donation_pledges_total` counter
- `form_submissions_total` counter
- `sync_operations_total` counter

---

## 4. Logging Standards

### 4.1 Structured Log Format (JSON)

```json
{
  "timestamp": "2026-10-10T12:00:00.123Z",
  "level": "info",
  "service": "web",
  "environment": "production",
  "trace_id": "abc123",
  "span_id": "def456",
  "locale": "en",
  "user_id": "user_123",
  "message": "Content page published",
  "context": {
    "page_id": "about-hero",
    "action": "publish",
    "locale": "de"
  }
}
```

### 4.2 Log Levels

| Level | Use Case | Retention |
|-------|----------|-----------|
| `error` | Exceptions, failed payments, sync failures | 1 year |
| `warn` | Rate limits, fallback translations, deprecated API use | 90 days |
| `info` | Publish events, admin actions, donation webhooks | 90 days |
| `debug` | SQL queries, cache hits/misses, translation prompts | 7 days |

### 4.3 PII Redaction

Automatic redaction of:
- Email addresses → `[email]`
- Phone numbers → `[phone]`
- Names in logs → `[name]`
- Addresses → `[address]`
- Credit card tokens → `[card]`
- JWT tokens → `[token]`

---

## 5. Sentry Configuration

```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Redact PII
    if (event.request?.cookies) delete event.request.cookies;
    if (event.user?.email) event.user.email = '[redacted]';
    return event;
  },
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
});
```

### 5.2 Alert Rules

| Rule | Condition | Notification |
|------|-----------|--------------|
| `high-error-rate` | > 50 errors/5m | PagerDuty + Slack #alerts |
| `new-issue` | First occurrence of error | Slack #alerts |
| `regression` | Error in latest release | PagerDuty + Slack #alerts |
| `csp-violation` | Content Security Policy violations | Slack #security |

---

## 6. Grafana Dashboards

### 6.1 Dashboard: "Public Website Overview"
- Request rate by locale
- Error rate by route
- p50/p95/p99 latency
- Core Web Vitals (LCP, FID, CLS)
- Translation coverage heatmap

### 6.2 Dashboard: "Donation Funnel"
- Page views → Widget load → Amount entered → Checkout → Success
- Conversion rates by locale
- Average donation amount
- Recurring vs one-time

### 6.3 Dashboard: "Field Operations"
- Sync success/failure rate
- Pending outbox count
- Conflict resolution time
- Offline queue depth
- Active field workers

### 6.4 Dashboard: "Compliance & Security"
- Safeguarding reports (count, severity)
- DSAR requests (open, overdue)
- Audit log volume
- Failed login attempts
- Rate limit triggers

---

## 7. Synthetic Monitoring (UptimeRobot / Better Uptime)

| Check | URL | Interval | Alert Threshold |
|-------|-----|----------|-----------------|
| Health | `https://awe-ev.org/api/health` | 1 min | 3 consecutive failures |
| Homepage EN | `https://awe-ev.org/en/public` | 5 min | HTTP != 200 |
| Homepage DE | `https://awe-ev.org/de/public` | 5 min | HTTP != 200 |
| Homepage AR | `https://awe-ev.org/ar/public` | 5 min | HTTP != 200 |
| Donate | `https://awe-ev.org/en/public/get-involved/donate` | 10 min | HTTP != 200 |
| Sitemap | `https://awe-ev.org/sitemap.xml` | 1 hour | HTTP != 200 |
| SSL | `https://awe-ev.org` | 1 day | Expires < 30 days |

---

## 8. Incident Response

### 8.1 Severity Levels

| Level | Definition | Response Time | Escalation |
|-------|------------|---------------|------------|
| **SEV-1** | Public site down, data loss, payment failure | 15 min | On-call + DPO + CTO |
| **SEV-2** | Degraded performance, partial outage, sync stuck | 1 hour | On-call + Tech Lead |
| **SEV-3** | Minor bug, cosmetic issue, non-critical feature | 24 hours | Next sprint |

### 8.2 Runbook Links

- [SEV-1: Site Down](docs/runbooks/site-down.md)
- [SEV-1: Payment Failure](docs/runbooks/payment-failure.md)
- [SEV-1: Data Breach](docs/runbooks/data-breach.md)
- [SEV-2: Sync Backlog](docs/runbooks/sync-backlog.md)
- [SEV-2: Translation Failures](docs/runbooks/translation-failures.md)
- [SEV-3: Content Issues](docs/runbooks/content-issues.md)

---

## 9. Deployment Monitoring

### 9.1 Pre-Deploy Checks (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
- name: Run production smoke tests
  run: |
    pnpm test:smoke
    pnpm verify
    
- name: Check migration safety
  run: pnpm verify:migrations

- name: Verify i18n parity
  run: pnpm verify:i18n
```

### 9.2 Post-Deploy Verification

1. Health check passes
2. Smoke tests on `/en/public`, `/ar/public`
3. Donation widget loads
4. Language switcher works
5. Metrics appear in Prometheus
6. No new Sentry errors in 10 min

### 9.3 Rollback Trigger

Automatic rollback if:
- Error rate > 5% for 5 min post-deploy
- p95 latency > 3s for 5 min
- Health check fails 3x consecutively

---

## 10. Cost Monitoring

| Resource | Budget | Alert |
|----------|--------|-------|
| Vercel Functions | $50/mo | > 80% |
| Supabase Database | $100/mo | > 80% |
| Supabase Storage | $20/mo | > 80% |
| Sentry Events | 50k/mo | > 80% |
| Stripe Fees | Variable | Track only |

---

## 11. Runbook: Key Procedures

### 11.1 Clear Outbox Backlog
```bash
# 1. Check pending count
curl -H "Authorization: Bearer $METRICS_TOKEN" https://awe-ev.org/api/metrics | grep outbox_pending

# 2. Trigger manual drain (Edge Function)
curl -X POST https://awe-ev.org/functions/v1/cron-runner \
  -H "Authorization: Bearer $CRON_SECRET"
```

### 11.2 Force Translation Retry
```sql
-- In Supabase dashboard
UPDATE content_page_translations
SET status = 'translation_pending', error_message = NULL
WHERE status = 'failed' AND created_at > now() - interval '24 hours';
```

### 11.3 Invalidate CMS Cache
```bash
# Via admin API or Vercel dashboard
curl -X POST https://awe-ev.org/api/revalidate \
  -H "Authorization: Bearer $REVALIDATE_SECRET" \
  -d '{"tags": ["public-content"]}'
```

---

## 12. Contact

**On-Call Rotation:** [PagerDuty Schedule](https://awe-ev.pagerduty.com)
**Slack:** #alerts, #incidents, #monitoring
**Grafana:** https://grafana.awe-ev.org
**Sentry:** https://sentry.awe-ev.org
**Prometheus:** https://prometheus.awe-ev.org

---

## 13. Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-10-10 | Platform Team | Initial monitoring specification |