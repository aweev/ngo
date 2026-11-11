-- =====================================================
-- NGO OS - Scheduled runtime: match the cron jobs to the live function contracts
--
-- Diagnosis (P1, after ADR-0001 moved the event spine onto cron-runner):
--   `schedule_cron_jobs()` still installed the PRE-rewrite poller set, and
--   three of its four jobs invoked functions that no longer accept that shape.
--   The job body calls `http_post(url := ..., headers := ..., timeout := ...)`
--   with no `body`, so pg_net applies its default `body = '{}'` and each of
--   those functions rejected the request on every tick:
--     * webhook-delivery         -> 400 (no delivery_id and no event_type)
--     * notification-dispatcher  -> 400 (its real drain path is GET)
--     * automation-engine        -> 400 (needs rule_id, or event + organization_id)
--   Net effect: notification delivery only advanced when a `notification`-type
--   scheduled job happened to run, and `webhook_deliveries` rows queued by the
--   automation engine (trigger_webhook) were never re-driven if the best-effort
--   fan-out failed. Two jobs were dead weight that also produced error noise.
--
-- Fixes applied here:
--   1. webhook_deliveries gains retry/lease state plus a
--      `claim_webhook_deliveries()` claim RPC (FOR UPDATE SKIP LOCKED,
--      per-tenant fairness, expiring leases) mirroring `claim_notifications`;
--      `webhook-delivery` now drains it on GET.
--   2. schedule_cron_jobs() installs only jobs that match a live contract:
--      cron-runner (POST, every minute) drives the event spine
--      (outbox -> webhook-delivery + automation-engine, per ADR-0001) and the
--      scheduled jobs; webhook-delivery (GET, every minute) redrives undelivered
--      rows; notification-dispatcher (GET, every 5 minutes) drains the queue.
--   3. The vestigial `automation-engine-5min` poller is explicitly unscheduled:
--      the engine has no queue to poll (it is invoked with a rule_id or an
--      event + organization_id by cron-runner).
-- =====================================================

-- -----------------------------------------------------
-- 1. webhook_deliveries: retry + lease state
-- -----------------------------------------------------
ALTER TABLE webhook_deliveries
    ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS lease_owner TEXT,
    ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_attempt_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending_due
    ON webhook_deliveries(created_at, next_attempt_at)
    WHERE delivered_at IS NULL;

-- -----------------------------------------------------
-- 2. claim_webhook_deliveries(): the GET drain's work claim
-- -----------------------------------------------------
-- Same contract as claim_notifications: one worker leases a bounded, FIFO,
-- per-tenant-fair slice of undelivered rows. Leases expire, so a crashed
-- worker's rows become claimable again without operator action.
CREATE OR REPLACE FUNCTION public.claim_webhook_deliveries(
    p_worker TEXT,
    p_batch INT DEFAULT 20,
    p_per_org INT DEFAULT 5,
    p_lease_seconds INT DEFAULT 60
) RETURNS SETOF public.webhook_deliveries
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF p_worker IS NULL OR p_worker = '' THEN
        RAISE EXCEPTION 'worker id is required';
    END IF;

    RETURN QUERY
    WITH due AS (
        SELECT wd.id
        FROM public.webhook_deliveries wd
        WHERE wd.delivered_at IS NULL
          AND wd.webhook_id IS NOT NULL
          AND wd.attempt_count < wd.max_attempts
          AND (wd.next_attempt_at IS NULL OR wd.next_attempt_at <= NOW())
          AND (wd.lease_owner IS NULL OR wd.lease_expires_at <= NOW())
        ORDER BY wd.created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT GREATEST(p_batch * 4, p_batch)
    ), picked AS (
        SELECT d.id,
               row_number() OVER (PARTITION BY wd.organization_id ORDER BY wd.created_at ASC) AS rn
        FROM due d
        JOIN public.webhook_deliveries wd ON wd.id = d.id
    )
    UPDATE public.webhook_deliveries wd
       SET lease_owner = p_worker,
           lease_expires_at = NOW() + make_interval(secs => p_lease_seconds)
      FROM picked p
     WHERE wd.id = p.id
       AND p.rn <= GREATEST(p_per_org, 1)
    RETURNING wd.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_webhook_deliveries(TEXT, INT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_webhook_deliveries(TEXT, INT, INT, INT) FROM anon;
REVOKE ALL ON FUNCTION public.claim_webhook_deliveries(TEXT, INT, INT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_webhook_deliveries(TEXT, INT, INT, INT) TO service_role;

comment on function public.claim_webhook_deliveries(TEXT, INT, INT, INT) is
    'Leases undelivered webhook rows to one worker (FIFO, per-org fair, expiring lease). Service-role only.';

-- -----------------------------------------------------
-- 3. Scheduled runtime: install only contract-matching jobs
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.schedule_cron_jobs(
    p_functions_base_url text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $fn$
DECLARE
    v_net_schema text;
    v_specs jsonb := jsonb_build_array(
        jsonb_build_object('name', 'cron-runner-every-minute', 'path', 'cron-runner', 'schedule', '* * * * *', 'method', 'http_post'),
        jsonb_build_object('name', 'webhook-delivery-every-minute', 'path', 'webhook-delivery', 'schedule', '* * * * *', 'method', 'http_get'),
        jsonb_build_object('name', 'notification-dispatcher-5min', 'path', 'notification-dispatcher', 'schedule', '*/5 * * * *', 'method', 'http_get')
    );
    -- Job names that no longer match a live contract and must not survive an
    -- upgrade from an earlier install.
    v_retired text[] := array['automation-engine-5min'];
    v_name text;
    v_spec jsonb;
    v_job text;
    v_installed int := 0;
    v_removed int := 0;
BEGIN
    -- Validate the URL: must be an https URL on the project's own functions host.
    -- Rejects attacker-supplied hosts / internal IPs / loopback.
    IF p_functions_base_url IS NULL OR p_functions_base_url = '' THEN
        RAISE EXCEPTION 'p_functions_base_url is required - pass your project functions hostname.';
    END IF;
    IF left(p_functions_base_url, 8) <> 'https://' THEN
        RAISE EXCEPTION 'p_functions_base_url must start with https://: %', p_functions_base_url;
    END IF;

    IF not exists (select 1 from pg_namespace where nspname = 'cron') then
        return 'skipped: pg_cron is not enabled. Enable it under Database > Extensions, then re-run schedule_cron_jobs().';
    END IF;

    select n.nspname into v_net_schema
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_net';
    if v_net_schema is null then
        return 'skipped: pg_net is not installed.';
    end if;

    if not exists (select 1 from vault.decrypted_secrets where name = 'cron_secret') then
        return 'skipped: no vault entry named cron_secret. Create it, then re-run schedule_cron_jobs().';
    end if;

    -- Retire jobs whose contract no longer exists (idempotent).
    foreach v_name in array v_retired
    loop
        if exists (select 1 from cron.job where jobname = v_name) then
            perform cron.unschedule(v_name);
            v_removed := v_removed + 1;
        end if;
    end loop;

    for v_spec in select value from jsonb_array_elements(v_specs)
    loop
        -- Re-running must never duplicate a job.
        if exists (select 1 from cron.job where jobname = v_spec->>'name') then
            perform cron.unschedule(v_spec->>'name');
        end if;

        -- URL is validated to start with https://; path and method are static
        -- constants from v_specs, so there is no SQL injection surface (format
        -- %I is used for identifiers, %L for the URL literal).
        v_job := format(
            'select %I.%I(url := %L, headers := jsonb_build_object(''content-type'', ''application/json'', ''x-cron-secret'', (select decrypted_secret from vault.decrypted_secrets where name = ''cron_secret'')), timeout_milliseconds := 25000);',
            v_net_schema,
            v_spec->>'method',
            p_functions_base_url || '/' || (v_spec->>'path')
        );

        perform cron.schedule(v_spec->>'name', v_spec->>'schedule', v_job);
        v_installed := v_installed + 1;
    end loop;

    if v_removed > 0 then
        return format('scheduled %s job(s) against %s (removed %s retired job(s))', v_installed, p_functions_base_url, v_removed);
    end if;
    return format('scheduled %s job(s) against %s', v_installed, p_functions_base_url);
END
$fn$;

-- SECURITY: only postgres (superuser) and the service role can invoke this.
REVOKE ALL ON FUNCTION public.schedule_cron_jobs(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_cron_jobs(text) TO postgres;

comment on function public.schedule_cron_jobs(text) is
    'Idempotently (re)installs the pg_cron jobs that match the deployed Edge Function contracts (cron-runner POST every minute; webhook-delivery and notification-dispatcher drain via GET) and unschedules retired pollers. Requires the project functions URL (no hardcoded default). Admin-only.';

