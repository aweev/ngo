-- =====================================================
-- NGO OS - RLS hardening: close the form_definitions exposure
--
-- Two facts combine into a real cross-tenant leak:
--
--   1. The schema-wide loop in 20240101000014 enables RLS only on tables that
--      exist *when it runs*. Anything created by a later migration is not
--      covered by it.
--   2. public.add_tenant_policies() creates the four tenant policies but never
--      enabled RLS itself, and Postgres defaults a new table to RLS OFF.
--
-- Every pre-loop table was protected by the loop, so the gap was invisible
-- until a later migration shipped a tenant table without its own ENABLE
-- statement. `form_definitions` (20260920000001) is exactly that case: it was
-- reachable by any authenticated member of any organization, for every
-- organization.
--
-- Repaired at three depths so the class cannot recur:
--   A. add_tenant_policies() now enables RLS on every table it polices.
--   B. A sweep enables RLS on any tenant table (one with organization_id) that
--      is still unprotected. Idempotent; reports what it changed.
--   C. scripts/verify-rls-isolation.mjs now fails CI when a post-loop table
--      relies on the generator without RLS being enabled.
-- =====================================================

-- -----------------------------------------------------
-- A. The policy generator owns RLS enablement
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_tenant_policies(
    p_tbl text,
    p_read text,
    p_manage text,
    p_update_extra text DEFAULT NULL,
    p_nullable_org boolean DEFAULT FALSE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_ok text;
    v_update_using text;
BEGIN
    -- Enabling RLS is part of policing a tenant table. Keeping it a separate
    -- manual step is what left form_definitions open.
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', p_tbl);

    IF p_nullable_org THEN
        v_org_ok := format('(organization_id IS NULL OR (organization_id IS NOT NULL AND public.user_has_permission(organization_id, %1$L)))', p_read);
    ELSE
        v_org_ok := format('(organization_id IS NOT NULL AND public.user_has_permission(organization_id, %1$L))', p_read);
    END IF;

    IF p_update_extra IS NULL THEN
        v_update_using := format('(organization_id IS NOT NULL AND public.user_has_permission(organization_id, %1$L))', p_manage);
    ELSE
        v_update_using := format('(organization_id IS NOT NULL AND (public.user_has_permission(organization_id, %1$L) OR public.user_has_permission(organization_id, %2$L)))', p_manage, p_update_extra);
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'perm_' || p_tbl || '_select', p_tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (%s);', 'perm_' || p_tbl || '_select', p_tbl, v_org_ok);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'perm_' || p_tbl || '_insert', p_tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (%s);',
        'perm_' || p_tbl || '_insert', p_tbl,
        format('(organization_id IS NOT NULL AND public.user_has_permission(organization_id, %1$L))', p_manage));

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'perm_' || p_tbl || '_update', p_tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (%s) WITH CHECK (%s);',
        'perm_' || p_tbl || '_update', p_tbl, v_update_using, v_update_using);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'perm_' || p_tbl || '_delete', p_tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (%s);',
        'perm_' || p_tbl || '_delete', p_tbl,
        format('(organization_id IS NOT NULL AND public.user_has_permission(organization_id, %1$L))', p_manage));
END;
$$;

-- -----------------------------------------------------
-- B. Close the already-exposed table, explicitly
-- -----------------------------------------------------
ALTER TABLE form_definitions ENABLE ROW LEVEL SECURITY;

-- Re-apply its policies through the hardened generator so the four statements
-- and the ENABLE share one source of truth.
SELECT public.add_tenant_policies('form_definitions', 'forms.read', 'forms.manage');

-- -----------------------------------------------------
-- C. Sweep: no tenant table may ever ship with RLS off
-- -----------------------------------------------------
-- Any table carrying organization_id is tenant data by definition. Enabling
-- RLS on it is always correct: with no policy the table fails closed, which is
-- a bug report rather than a breach.
DO $$
DECLARE
    r RECORD;
    v_fixed text[] := '{}';
BEGIN
    FOR r IN
        SELECT c.relname AS table_name
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'organization_id'
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relrowsecurity = FALSE
        ORDER BY c.relname
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', r.table_name);
        v_fixed := array_append(v_fixed, r.table_name);
    END LOOP;

    IF array_length(v_fixed, 1) IS NOT NULL THEN
        RAISE NOTICE 'RLS hardening: enabled Row Level Security on % tenant table(s): %',
            array_length(v_fixed, 1), array_to_string(v_fixed, ', ');
    ELSE
        RAISE NOTICE 'RLS hardening: no unprotected tenant tables found.';
    END IF;
END $$;
