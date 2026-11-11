-- =====================================================
-- NGO OS - Scheduled runtime tests
-- =====================================================
-- Behavioural coverage for 20261103000002_fix_schedule_cron_runtime.sql:
--
--   claim_webhook_deliveries()  due/undelivered targeting, per-org fairness,
--                               lease exclusivity, lease expiry, worker-id
--                               guard, execute-privilege posture
--   schedule_cron_jobs()        installs only contract-matching jobs
--                               (cron-runner POST; webhook-delivery and
--                               notification-dispatcher GET), retires the
--                               automation-engine poller, is idempotent,
--                               rejects non-https, skips cleanly without Vault
--
-- Run it with the runner, which owns the transaction and always rolls back:
--
--   node scripts/run-runtime-tests.mjs "$DATABASE_URL"
--
-- Any failed assertion aborts with a message. Silence = all green.

CREATE SCHEMA IF NOT EXISTS tests;

CREATE OR REPLACE FUNCTION tests.assert(p_cond boolean, p_msg text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT COALESCE(p_cond, FALSE) THEN
        RAISE EXCEPTION 'ASSERT FAILED: %', p_msg;
    END IF;
END;
$$;

-- The fixtures use synthetic organization/webhook ids so the file runs on a bare
-- PostgreSQL too. Dropping the foreign keys inside the (rolled-back) test
-- transaction keeps that true on a real stack, where they are enforced.
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.webhook_deliveries'::regclass AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE public.webhook_deliveries DROP CONSTRAINT %I', r.conname);
    END LOOP;
END
$$;

TRUNCATE public.webhook_deliveries;

-- Two organizations; due / delivered / exhausted / not-yet-due / no-target rows.
INSERT INTO public.webhook_deliveries
    (organization_id, webhook_id, event_type, attempt_count, delivered_at, next_attempt_at)
VALUES
    ('00000000-0000-0000-0000-00000000000a', gen_random_uuid(), 'due-a1',            1, NULL, NULL),
    ('00000000-0000-0000-0000-00000000000a', gen_random_uuid(), 'due-a2',            1, NULL, NULL),
    ('00000000-0000-0000-0000-00000000000a', gen_random_uuid(), 'due-a3',            1, NULL, NULL),
    ('00000000-0000-0000-0000-00000000000b', gen_random_uuid(), 'due-b1',            1, NULL, NULL),
    ('00000000-0000-0000-0000-00000000000a', gen_random_uuid(), 'already-delivered', 2, NOW(), NULL),
    ('00000000-0000-0000-0000-00000000000a', gen_random_uuid(), 'exhausted',         5, NULL, NULL),
    ('00000000-0000-0000-0000-00000000000a', gen_random_uuid(), 'not-due',           1, NULL, NOW() + interval '1 hour'),
    ('00000000-0000-0000-0000-00000000000a', NULL,              'no-webhook',        1, NULL, NULL);

-- 1. Only due + undelivered + targeted rows are claimable, and they get leased.
DO $$
DECLARE v_count int;
BEGIN
    SELECT count(*) INTO v_count FROM public.claim_webhook_deliveries('rt-w1', 25, 5, 60);
    PERFORM tests.assert(v_count = 4, format('expected 4 claimable rows, got %s', v_count));

    SELECT count(*) INTO v_count FROM public.webhook_deliveries WHERE lease_owner = 'rt-w1';
    PERFORM tests.assert(v_count = 4, format('expected 4 leased rows, got %s', v_count));

    SELECT count(*) INTO v_count FROM public.claim_webhook_deliveries('rt-w2', 25, 5, 60);
    PERFORM tests.assert(v_count = 0, format('a live lease was double-claimed (%s rows)', v_count));
END
$$;

-- 2. Per-organization fairness: cap 1 yields one row per org, not four from A.
UPDATE public.webhook_deliveries SET lease_owner = NULL, lease_expires_at = NULL;
DO $$
DECLARE v_count int; v_a int; v_b int;
BEGIN
    SELECT count(*) INTO v_count FROM public.claim_webhook_deliveries('rt-w3', 25, 1, 60);
    PERFORM tests.assert(v_count = 2, format('per-org cap 1 should yield 2 rows, got %s', v_count));

    SELECT count(*) INTO v_a FROM public.webhook_deliveries
     WHERE lease_owner = 'rt-w3' AND organization_id = '00000000-0000-0000-0000-00000000000a';
    SELECT count(*) INTO v_b FROM public.webhook_deliveries
     WHERE lease_owner = 'rt-w3' AND organization_id = '00000000-0000-0000-0000-00000000000b';
    PERFORM tests.assert(v_a = 1 AND v_b = 1, format('fairness broken: org_a=%s org_b=%s', v_a, v_b));
END
$$;

-- 3. Expired leases are reclaimable without operator action.
UPDATE public.webhook_deliveries SET lease_expires_at = NOW() - interval '1 minute';
DO $$
DECLARE v_count int;
BEGIN
    SELECT count(*) INTO v_count FROM public.claim_webhook_deliveries('rt-w4', 25, 5, 60);
    PERFORM tests.assert(v_count = 4, format('expired leases were not reclaimable, got %s', v_count));
END
$$;

-- 4. A worker id is mandatory (same guard as the other claim RPCs).
UPDATE public.webhook_deliveries SET lease_owner = NULL, lease_expires_at = NULL;
DO $$
BEGIN
    BEGIN
        PERFORM public.claim_webhook_deliveries('', 10, 5, 60);
        PERFORM tests.assert(FALSE, 'an empty worker id was accepted');
    EXCEPTION
        WHEN others THEN
            PERFORM tests.assert(
                position('worker id is required' IN SQLERRM) > 0,
                format('unexpected error for an empty worker id: %s', SQLERRM));
    END;
END
$$;

-- 5. Only service_role may execute the claim RPC.
DO $$
BEGIN
    PERFORM tests.assert(
        has_function_privilege('service_role', 'public.claim_webhook_deliveries(text, int, int, int)', 'EXECUTE'),
        'service_role cannot execute claim_webhook_deliveries');
    PERFORM tests.assert(
        NOT has_function_privilege('anon', 'public.claim_webhook_deliveries(text, int, int, int)', 'EXECUTE'),
        'anon must not be able to execute claim_webhook_deliveries');
    PERFORM tests.assert(
        NOT has_function_privilege('authenticated', 'public.claim_webhook_deliveries(text, int, int, int)', 'EXECUTE'),
        'authenticated must not be able to execute claim_webhook_deliveries');
END
$$;

-- 6. schedule_cron_jobs(): installs only the jobs that match a live contract.
--    The installer needs a readable Vault secret. Provision one through the
--    supported API when this database has none, and fall back to asserting the
--    clean-skip path when Vault cannot be written at all.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cron_secret') THEN
        IF EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'vault' AND p.proname = 'create_secret'
        ) THEN
            EXECUTE $q$SELECT vault.create_secret('schedule-runtime-test-secret', 'cron_secret', 'schedule runtime test')$q$;
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'vault' AND table_name = 'decrypted_secrets'
        ) THEN
            EXECUTE $q$INSERT INTO vault.decrypted_secrets (name, decrypted_secret)
                        VALUES ('cron_secret', 'schedule-runtime-test-secret')$q$;
        END IF;
    END IF;
END
$$;

DO $$
DECLARE
    v_msg text;
    v_name text;
    v_sched text;
    v_cmd text;
    v_n int;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'cron_secret') THEN
        v_msg := public.schedule_cron_jobs('https://runtime.test/functions/v1');
        PERFORM tests.assert(
            position('skipped: no vault entry named cron_secret' IN v_msg) > 0,
            format('expected a clean skip without Vault, got: %s', v_msg));
        RAISE NOTICE 'installer assertions skipped: no readable Vault secret on this database';
        RETURN;
    END IF;

    -- Start from a stale install: the retired poller plus the old job names.
    FOREACH v_name IN ARRAY ARRAY[
        'cron-runner-every-minute', 'webhook-delivery-every-minute',
        'notification-dispatcher-5min', 'automation-engine-5min'
    ]
    LOOP
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = v_name) THEN
            PERFORM cron.unschedule(v_name);
        END IF;
    END LOOP;
    PERFORM cron.schedule('automation-engine-5min', '*/5 * * * *', 'select 1');

    v_msg := public.schedule_cron_jobs('https://runtime.test/functions/v1');
    PERFORM tests.assert(position('scheduled 3 job(s)' IN v_msg) > 0,
        format('expected 3 scheduled jobs, got: %s', v_msg));
    PERFORM tests.assert(position('removed 1 retired job(s)' IN v_msg) > 0,
        format('expected the removal to be reported, got: %s', v_msg));
    PERFORM tests.assert(
        NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'automation-engine-5min'),
        'the retired automation-engine-5min poller survived');

    SELECT count(*) INTO v_n FROM cron.job
     WHERE jobname IN ('cron-runner-every-minute', 'webhook-delivery-every-minute', 'notification-dispatcher-5min');
    PERFORM tests.assert(v_n = 3, format('expected exactly 3 contract jobs, got %s', v_n));

    SELECT schedule, command INTO v_sched, v_cmd FROM cron.job WHERE jobname = 'cron-runner-every-minute';
    PERFORM tests.assert(v_sched = '* * * * *', format('cron-runner schedule: %s', v_sched));
    PERFORM tests.assert(position('http_post' IN v_cmd) > 0, format('cron-runner must POST: %s', v_cmd));

    SELECT schedule, command INTO v_sched, v_cmd FROM cron.job WHERE jobname = 'webhook-delivery-every-minute';
    PERFORM tests.assert(v_sched = '* * * * *', format('webhook-delivery schedule: %s', v_sched));
    PERFORM tests.assert(position('http_get' IN v_cmd) > 0, format('webhook-delivery must GET its drain path: %s', v_cmd));
    PERFORM tests.assert(position('http_post' IN v_cmd) = 0, format('webhook-delivery must not POST: %s', v_cmd));

    SELECT schedule, command INTO v_sched, v_cmd FROM cron.job WHERE jobname = 'notification-dispatcher-5min';
    PERFORM tests.assert(v_sched = '*/5 * * * *', format('notification-dispatcher schedule: %s', v_sched));
    PERFORM tests.assert(position('http_get' IN v_cmd) > 0, format('notification-dispatcher must GET its drain path: %s', v_cmd));

    -- Every job sources the shared secret from Vault at run time.
    SELECT count(*) INTO v_n FROM cron.job
     WHERE jobname IN ('cron-runner-every-minute', 'webhook-delivery-every-minute', 'notification-dispatcher-5min')
       AND (command NOT LIKE '%x-cron-secret%' OR command NOT LIKE '%cron_secret%');
    PERFORM tests.assert(v_n = 0, format('%s job(s) do not source x-cron-secret from Vault', v_n));

    -- Idempotent: re-running never duplicates.
    PERFORM public.schedule_cron_jobs('https://runtime.test/functions/v1');
    SELECT count(*) INTO v_n FROM cron.job
     WHERE jobname IN ('cron-runner-every-minute', 'webhook-delivery-every-minute', 'notification-dispatcher-5min');
    PERFORM tests.assert(v_n = 3, format('re-running the installer duplicated jobs: %s', v_n));

    -- Non-https URLs are rejected before anything is scheduled.
    BEGIN
        PERFORM public.schedule_cron_jobs('http://insecure.test/functions/v1');
        PERFORM tests.assert(FALSE, 'an http:// URL was accepted');
    EXCEPTION
        WHEN others THEN
            PERFORM tests.assert(
                position('must start with https://' IN SQLERRM) > 0,
                format('unexpected validation error: %s', SQLERRM));
    END;
END
$$;

-- 7. Only postgres/service_role may run the installer.
DO $$
BEGIN
    PERFORM tests.assert(
        NOT has_function_privilege('anon', 'public.schedule_cron_jobs(text)', 'EXECUTE'),
        'anon must not be able to execute schedule_cron_jobs');
    PERFORM tests.assert(
        NOT has_function_privilege('authenticated', 'public.schedule_cron_jobs(text)', 'EXECUTE'),
        'authenticated must not be able to execute schedule_cron_jobs');
END
$$;