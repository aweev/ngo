-- =====================================================
-- NGO OS - Wave 3: per-tenant quotas + fairness
--
-- claim_*() RPCs already cap rows per org inside one batch. This adds the
-- control-plane side: declared quotas per tenant so one noisy org can be
-- throttled without starving the rest, plus a helper the workers call to
-- check an org before draining its queue.
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_quotas (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    -- max rows one worker invocation may claim for this tenant
    max_claim_per_run INT NOT NULL DEFAULT 5 CHECK (max_claim_per_run BETWEEN 1 AND 100),
    -- max outbox events the tenant may enqueue per hour (abuse / bug guard)
    max_outbox_per_hour INT NOT NULL DEFAULT 1000 CHECK (max_outbox_per_hour BETWEEN 10 AND 100000),
    -- when set, workers skip the tenant until this timestamp (incident hold)
    suspended_until TIMESTAMPTZ,
    suspend_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tenant_quotas ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('tenant_quotas', 'audit.read', 'audit.manage');

COMMENT ON TABLE tenant_quotas IS
    'Wave 3 control plane: per-tenant fairness caps and incident holds for background work.';

-- Returns true when the tenant may be served right now.
CREATE OR REPLACE FUNCTION public.tenant_may_claim(p_org UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT q.suspended_until IS NULL OR q.suspended_until <= NOW()
         FROM public.tenant_quotas q
         WHERE q.organization_id = p_org),
        TRUE
    );
$$;

-- Hourly outbox volume for quota checks (read-model friendly).
DROP VIEW IF EXISTS reporting_outbox_hourly;
CREATE VIEW reporting_outbox_hourly WITH (security_invoker = true) AS
SELECT organization_id,
       date_trunc('hour', created_at)::timestamptz AS bucket_hour,
       count(*) AS event_count
FROM public.outbox_events
GROUP BY 1, 2;

COMMENT ON VIEW reporting_outbox_hourly IS
    'Wave 3 read model: hourly outbox volume per tenant for quota monitoring.';
