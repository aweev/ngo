-- =====================================================
-- NGO OS - Reliability kernel (audit Wave 3)
--
-- Adds to the existing scheduler/messaging tables:
--   * leases (lease_owner / lease_expires_at) + attempt counters + backoff
--     scheduling (next_attempt_at) + dead-letter state (dead_lettered_at)
--   * idempotency keys for notifications and webhook deliveries
--   * job_executions.dedupe_key so a schedule slot is only recorded once
-- Creates:
--   * outbox_events — transactional outbox for every cross-system side
--     effect (enqueued inside the request, drained by cron-runner)
--   * claim_*() functions using FOR UPDATE SKIP LOCKED with per-tenant
--     fairness caps (no global limit(N) starvation)
--   * reporting_*_monthly read models (security_invoker views) so reports
--     stop snapshotting broad operational money rows
-- =====================================================

-- -----------------------------------------------------
-- 1. Scheduler: leases, attempts, backoff, dead letters
-- -----------------------------------------------------
ALTER TABLE scheduled_jobs
    ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS lease_owner TEXT,
    ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMPTZ;

ALTER TABLE scheduled_jobs DROP CONSTRAINT IF EXISTS scheduled_jobs_last_run_status_check;
ALTER TABLE scheduled_jobs ADD CONSTRAINT scheduled_jobs_last_run_status_check
    CHECK (last_run_status IS NULL
           OR last_run_status IN ('success', 'failure', 'skipped', 'dead_letter'));

ALTER TABLE job_executions
    ADD COLUMN IF NOT EXISTS attempt INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- One execution row per schedule slot: duplicate claims become a unique
-- violation instead of double-counted work.
CREATE UNIQUE INDEX IF NOT EXISTS uq_job_executions_dedupe
    ON job_executions(job_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_due
    ON scheduled_jobs(is_active, next_run_at, next_attempt_at)
    WHERE is_active = TRUE;

-- -----------------------------------------------------
-- 2. Notifications: claims, backoff, idempotency
-- -----------------------------------------------------
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
    ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS lease_owner TEXT,
    ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_idem
    ON notifications(organization_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_pending_due
    ON notifications(created_at, next_attempt_at)
    WHERE status = 'pending';

-- -----------------------------------------------------
-- 3. Webhook deliveries: idempotent redelivery
-- -----------------------------------------------------
ALTER TABLE webhook_deliveries
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- The same (organization, event, target, payload digest) creates ONE delivery
-- record; retries bump attempt_count instead of appending duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_deliveries_idem
    ON webhook_deliveries(organization_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- -----------------------------------------------------
-- 4. Transactional outbox
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'delivered', 'dead')),
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 8,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lease_owner TEXT,
    lease_expires_at TIMESTAMPTZ,
    last_error TEXT,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_claim
    ON outbox_events(available_at, created_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_outbox_events_org_status
    ON outbox_events(organization_id, status);

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('outbox_events', 'audit.read', 'audit.manage');

-- -----------------------------------------------------
-- 5. Claim functions: FOR UPDATE SKIP LOCKED + tenant fairness
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_due_jobs(
    p_worker TEXT,
    p_batch INT DEFAULT 10,
    p_per_org INT DEFAULT 3,
    p_lease_seconds INT DEFAULT 120
) RETURNS SETOF public.scheduled_jobs
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF p_worker IS NULL OR p_worker = '' THEN
        RAISE EXCEPTION 'worker id is required';
    END IF;

    RETURN QUERY
    WITH due AS (
        SELECT sj.id
        FROM public.scheduled_jobs sj
        WHERE sj.is_active = TRUE
          AND (sj.next_run_at IS NULL OR sj.next_run_at <= NOW())
          AND (sj.next_attempt_at IS NULL OR sj.next_attempt_at <= NOW())
          AND (sj.lease_owner IS NULL OR sj.lease_expires_at <= NOW())
        ORDER BY COALESCE(sj.next_attempt_at, sj.next_run_at, sj.created_at) ASC
        FOR UPDATE SKIP LOCKED
        LIMIT GREATEST(p_batch * 4, p_batch)
    ), picked AS (
        SELECT d.id,
               row_number() OVER (
                   PARTITION BY sj.organization_id
                   ORDER BY COALESCE(sj.next_attempt_at, sj.next_run_at, sj.created_at) ASC
               ) AS rn
        FROM due d
        JOIN public.scheduled_jobs sj ON sj.id = d.id
    )
    UPDATE public.scheduled_jobs sj
       SET lease_owner = p_worker,
           lease_expires_at = NOW() + make_interval(secs => p_lease_seconds)
      FROM picked p
     WHERE sj.id = p.id
       AND p.rn <= GREATEST(p_per_org, 1)
    RETURNING sj.*;
END;
$$;

-- Atomically leases due rows to ONE worker. FIFO ordering with a
-- per-organization cap in the same batch prevents one tenant from starving
-- the rest (audit: no global limit(N)). Leases expire, so a crashed
-- worker's rows become claimable again without operator action.

CREATE OR REPLACE FUNCTION public.claim_outbox_events(
    p_worker TEXT,
    p_batch INT DEFAULT 25,
    p_per_org INT DEFAULT 5,
    p_lease_seconds INT DEFAULT 60
) RETURNS SETOF public.outbox_events
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF p_worker IS NULL OR p_worker = '' THEN
        RAISE EXCEPTION 'worker id is required';
    END IF;

    RETURN QUERY
    WITH due AS (
        SELECT oe.id
        FROM public.outbox_events oe
        WHERE oe.status = 'pending'
          AND oe.attempts < oe.max_attempts
          AND oe.available_at <= NOW()
          AND (oe.lease_owner IS NULL OR oe.lease_expires_at <= NOW())
        ORDER BY oe.available_at ASC, oe.created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT GREATEST(p_batch * 4, p_batch)
    ), picked AS (
        SELECT d.id,
               row_number() OVER (PARTITION BY oe.organization_id ORDER BY oe.created_at ASC) AS rn
        FROM due d
        JOIN public.outbox_events oe ON oe.id = d.id
    )
    UPDATE public.outbox_events oe
       SET status = 'processing',
           lease_owner = p_worker,
           lease_expires_at = NOW() + make_interval(secs => p_lease_seconds),
           updated_at = NOW()
      FROM picked p
     WHERE oe.id = p.id
       AND p.rn <= GREATEST(p_per_org, 1)
    RETURNING oe.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_notifications(
    p_worker TEXT,
    p_batch INT DEFAULT 20,
    p_per_org INT DEFAULT 5,
    p_lease_seconds INT DEFAULT 60
) RETURNS SETOF public.notifications
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF p_worker IS NULL OR p_worker = '' THEN
        RAISE EXCEPTION 'worker id is required';
    END IF;

    RETURN QUERY
    WITH due AS (
        SELECT n.id
        FROM public.notifications n
        WHERE n.status = 'pending'
          AND n.attempt_count < n.max_attempts
          AND (n.next_attempt_at IS NULL OR n.next_attempt_at <= NOW())
          AND (n.lease_owner IS NULL OR n.lease_expires_at <= NOW())
        ORDER BY n.created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT GREATEST(p_batch * 4, p_batch)
    ), picked AS (
        SELECT d.id,
               row_number() OVER (PARTITION BY n.organization_id ORDER BY n.created_at ASC) AS rn
        FROM due d
        JOIN public.notifications n ON n.id = d.id
    )
    UPDATE public.notifications n
       SET lease_owner = p_worker,
           lease_expires_at = NOW() + make_interval(secs => p_lease_seconds)
      FROM picked p
     WHERE n.id = p.id
       AND p.rn <= GREATEST(p_per_org, 1)
    RETURNING n.*;
END;
$$;

-- -----------------------------------------------------
-- 6. Reporting read models (aggregates, not raw money rows)
-- -----------------------------------------------------
-- Reports read these instead of snapshotting broad operational rows (audit
-- Wave 3: "read models/warehouse for reporting"). security_invoker=TRUE
-- keeps each caller's row policies enforcing tenant isolation THROUGH the
-- view (service-role queries stay org-filtered by the report's own scope).
DROP VIEW IF EXISTS reporting_donations_monthly;
CREATE VIEW reporting_donations_monthly WITH (security_invoker = true) AS
SELECT d.organization_id,
       date_trunc('month', d.donated_at)::date AS bucket_month,
       d.currency,
       d.status,
       count(*) AS row_count,
       sum(d.amount) AS total_amount
FROM public.donations d
GROUP BY 1, 2, 3, 4;

DROP VIEW IF EXISTS reporting_expenses_monthly;
CREATE VIEW reporting_expenses_monthly WITH (security_invoker = true) AS
SELECT e.organization_id,
       date_trunc('month', COALESCE(e.paid_at::timestamptz, e.created_at))::date AS bucket_month,
       e.currency,
       e.status,
       e.category,
       count(*) AS row_count,
       sum(e.amount) AS total_amount
FROM public.expenses e
GROUP BY 1, 2, 3, 4, 5;

COMMENT ON VIEW reporting_donations_monthly IS
    'Wave 3 read model: monthly donation aggregates — reporting jobs snapshot this instead of raw donation rows.';
COMMENT ON VIEW reporting_expenses_monthly IS
    'Wave 3 read model: monthly expense aggregates — reporting jobs snapshot this instead of raw expense rows.';

