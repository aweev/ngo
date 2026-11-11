-- =====================================================
-- NGO OS - Scheduled-runtime harness shims
-- =====================================================
-- `schedule-runtime-tests.sql` exercises the pg_cron installer and the
-- webhook-delivery claim RPC. Both depend on Supabase-owned objects:
--
--   roles anon / authenticated / service_role   (the REVOKE / GRANT targets)
--   extensions.pg_net                           (the installer's probe)
--   cron.job / cron.schedule / cron.unschedule  (job installation)
--   vault.decrypted_secrets                     (the shared secret)
--   public.webhook_deliveries                   (the migration ALTERs it)
--
-- On a real Supabase stack those already exist and every block below is a
-- no-op; on a bare PostgreSQL (the live-db harness) they are created here.
-- Everything runs inside the runner's transaction and is rolled back, so no
-- object, cron job or row survives the run.

-- Supabase's API roles (mirrors supabase/tests/live-db-bootstrap.sql).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN BYPASSRLS;
    END IF;
END
$$;

-- pg_net ships in the `extensions` schema; the installer probes pg_extension
-- for it and skips cleanly when absent. Register it so the job-build path runs
-- on a bare PostgreSQL (the extension itself is never invoked).
CREATE SCHEMA IF NOT EXISTS extensions;
INSERT INTO pg_extension (oid, extname, extowner, extnamespace, extrelocatable, extversion, extconfig, extcondition)
SELECT (SELECT COALESCE(MAX(oid::bigint), 16000) + 1 FROM pg_extension)::oid,
       'pg_net',
       (SELECT oid FROM pg_roles WHERE rolname = current_user),
       'extensions'::regnamespace,
       TRUE,
       '0.10.0',
       NULL,
       NULL
WHERE NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net');

-- pg_cron surface. Only created when pg_cron is not installed: replacing a real
-- extension member with CREATE OR REPLACE would fail, and the real functions
-- already behave the way the assertions expect.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'cron' AND p.proname = 'schedule'
    ) THEN
        CREATE SCHEMA IF NOT EXISTS cron;
        CREATE TABLE IF NOT EXISTS cron.job (
            jobname TEXT PRIMARY KEY,
            schedule TEXT NOT NULL,
            command TEXT NOT NULL
        );
        EXECUTE $c$
            CREATE OR REPLACE FUNCTION cron.schedule(p_name TEXT, p_schedule TEXT, p_command TEXT)
            RETURNS BIGINT LANGUAGE plpgsql AS $fn$
            BEGIN
                INSERT INTO cron.job (jobname, schedule, command)
                VALUES (p_name, p_schedule, p_command)
                ON CONFLICT (jobname) DO UPDATE
                    SET schedule = EXCLUDED.schedule, command = EXCLUDED.command;
                RETURN 1;
            END $fn$;
        $c$;
        EXECUTE $c$
            CREATE OR REPLACE FUNCTION cron.unschedule(p_name TEXT)
            RETURNS BOOLEAN LANGUAGE plpgsql AS $fn$
            BEGIN
                DELETE FROM cron.job WHERE jobname = p_name;
                RETURN TRUE;
            END $fn$;
        $c$;
    END IF;
END
$$;

-- Vault surface. `vault.decrypted_secrets` is a TABLE on the bare harness and a
-- read-only VIEW on a real stack, so the test provisions the secret through
-- `vault.create_secret()` when that exists and only creates the table when the
-- whole schema is missing.
DO $$
BEGIN
    IF to_regclass('vault.decrypted_secrets') IS NULL THEN
        CREATE SCHEMA IF NOT EXISTS vault;
        CREATE TABLE vault.decrypted_secrets (
            name TEXT PRIMARY KEY,
            decrypted_secret TEXT NOT NULL
        );
    END IF;
END
$$;

-- webhook_deliveries as the pre-migration schema defines it, for a bare
-- PostgreSQL. Skipped on a real stack (the real table, with its constraints,
-- is already there).
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    webhook_id UUID,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_status INT,
    response_body TEXT,
    attempt_count INT NOT NULL DEFAULT 1,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);