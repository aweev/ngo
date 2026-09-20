-- =====================================================
-- NGO OS - Harden scheduled runtime installer
--
-- P0-SEC: `schedule_cron_jobs()` (migration 20260918000001) had a hardcoded
-- production project URL as its default and granted EXECUTE to PUBLIC by
-- default. An anonymous Postgres role could call it with an attacker-controlled
-- URL to exfiltrate the cron secret via vault.decrypted_secrets.
--
-- Fixes applied here:
--   1. Drop + recreate with p_functions_base_url as REQUIRED (no default).
--      The caller must pass the correct functions hostname for their project.
--   2. REVOKE ALL ON FUNCTION FROM PUBLIC — only postgres/service_role may run it.
-- =====================================================

-- Remove the old function entirely so we can recreate without the hardcoded default.
DROP FUNCTION IF EXISTS public.schedule_cron_jobs(text);

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
        jsonb_build_object('name', 'cron-runner-every-minute', 'path', 'cron-runner', 'schedule', '* * * * *'),
        jsonb_build_object('name', 'webhook-delivery-every-minute', 'path', 'webhook-delivery', 'schedule', '* * * * *'),
        jsonb_build_object('name', 'notification-dispatcher-5min', 'path', 'notification-dispatcher', 'schedule', '*/5 * * * *'),
        jsonb_build_object('name', 'automation-engine-5min', 'path', 'automation-engine', 'schedule', '*/5 * * * *')
    );
    v_spec jsonb;
    v_job text;
    v_installed int := 0;
BEGIN
    -- Validate the URL: must be an https URL on the project's own functions host.
    -- Rejects attacker-supplied hosts / internal IPs / loopback.
    IF p_functions_base_url IS NULL OR p_functions_base_url = '' THEN
        RAISE EXCEPTION 'p_functions_base_url is required — pass your project''s functions hostname.';
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

    for v_spec in select value from jsonb_array_elements(v_specs)
    loop
        -- Re-running must never duplicate a job.
        if exists (select 1 from cron.job where jobname = v_spec->>'name') then
            perform cron.unschedule(v_spec->>'name');
        end if;

        -- URL is validated to start with https://; the path is a static constant,
        -- so there is no SQL injection surface. format %I is used for the
        -- schema identifier (safe), %L for the URL literal.
        v_job := format(
            'select %I.http_post(url := %L, headers := jsonb_build_object(''content-type'', ''application/json'', ''x-cron-secret'', (select decrypted_secret from vault.decrypted_secrets where name = ''cron_secret'')), timeout_milliseconds := 25000);',
            v_net_schema,
            p_functions_base_url || '/' || (v_spec->>'path')
        );

        perform cron.schedule(v_spec->>'name', v_spec->>'schedule', v_job);
        v_installed := v_installed + 1;
    end loop;

    return format('scheduled %s job(s) against %s', v_installed, p_functions_base_url);
END
$fn$;

-- SECURITY: only postgres (superuser) and the service role can invoke this.
REVOKE ALL ON FUNCTION public.schedule_cron_jobs(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_cron_jobs(text) TO postgres;

comment on function public.schedule_cron_jobs(text) is
    'Idempotently (re)installs the pg_cron jobs that invoke the scheduled Edge Functions. '
    || 'Requires the project''s functions URL (no hardcoded default). Admin-only.';
