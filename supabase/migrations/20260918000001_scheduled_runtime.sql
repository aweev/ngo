-- =====================================================
-- NGO OS - Scheduled execution runtime (pg_cron + pg_net)
--
-- Recurring invocations for the four deployed Edge Functions:
--   cron-runner              every minute  - fans out due scheduled_jobs
--   webhook-delivery         every minute  - drains pending webhook_deliveries
--   notification-dispatcher  every 5 min   - sends queued notifications
--   automation-engine        every 5 min   - evaluates enabled automation rules
--
-- Every request carries the shared x-cron-secret header. The job body reads the
-- value from Vault at run time, so cron.job never stores the secret and
-- rotation is a single Vault update.
--
-- Operator finish-up (the only manual step; run in the SQL editor):
--   1) supabase secrets set CRON_SECRET=<value> --project-ref <ref>
--   2) select vault.create_secret('<value>', 'cron_secret', 'scheduled runtime');
--   3) select public.schedule_cron_jobs();
-- This migration already calls (3); it is a no-op until (2) exists.
-- =====================================================

-- pg_net provides the async HTTP client used by the jobs. Installed
-- best-effort: failure is reported as a notice so migrations still apply on a
-- project where the extension must be enabled from the Dashboard.
do $ext$
begin
    begin
        create extension if not exists pg_net with schema extensions;
    exception when others then
        raise notice 'pg_net could not be installed automatically: %', sqlerrm;
    end;
end
$ext$;

-- Idempotent installer for the recurring jobs. Returns a status string instead
-- of raising when a prerequisite is missing, so a partially configured project
-- can finish setup later without re-running migrations.
create or replace function public.schedule_cron_jobs(
    p_functions_base_url text default 'https://vxhemqwlzaxpigvsjrjp.supabase.co/functions/v1'
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_catalog
as $fn$
declare
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
begin
    if not exists (select 1 from pg_namespace where nspname = 'cron') then
        return 'skipped: pg_cron is not enabled. Enable it under Database > Extensions, then re-run schedule_cron_jobs().';
    end if;

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

        v_job := format(
            'select %I.http_post(url := %L, headers := jsonb_build_object(''content-type'', ''application/json'', ''x-cron-secret'', (select decrypted_secret from vault.decrypted_secrets where name = ''cron_secret'')), timeout_milliseconds := 25000);',
            v_net_schema,
            p_functions_base_url || '/' || (v_spec->>'path')
        );

        perform cron.schedule(v_spec->>'name', v_spec->>'schedule', v_job);
        v_installed := v_installed + 1;
    end loop;

    return format('scheduled %s job(s) against %s', v_installed, p_functions_base_url);
end
$fn$;

comment on function public.schedule_cron_jobs(text) is
    'Idempotently (re)installs the pg_cron jobs that invoke the scheduled Edge Functions. Safe to run repeatedly.';

-- Install now if the project is already configured; otherwise emit the notice.
do $do$
begin
    raise notice '%', public.schedule_cron_jobs();
end
$do$;
