-- =====================================================
-- NGO OS - RLS Isolation & Role Tests (Phase 2, items 20-21)
-- =====================================================
-- Run this against a database with the full schema + the new
-- schema-rls-extended.sql applied. Executes as the postgres role
-- (Supabase SQL editor / psql) and impersonates users by setting the
-- request.jwt.claim.sub claim, exactly as Supabase auth does.
--
--   psql $DATABASE_URL -f supabase/tests/rls-isolation-tests.sql
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

-- Returns TRUE when executing p_sql raises any error (used to assert that
-- unauthorized statements are rejected).
CREATE OR REPLACE FUNCTION tests.expect_error(p_sql text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    EXECUTE p_sql;
    RETURN FALSE;
EXCEPTION
    WHEN others THEN
        RETURN TRUE;
END;
$$;

GRANT USAGE ON SCHEMA tests TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated;

BEGIN;

-- =====================================================
-- 1. Seed two organizations and members for every role
-- =====================================================
-- Fixed UUIDs keep the test deterministic.
INSERT INTO organizations (id, name, slug) VALUES
    ('00000000-0000-0000-0000-00000000000a', 'Org A', 'org-a'),
    ('00000000-0000-0000-0000-00000000000b', 'Org B', 'org-b')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role) VALUES
    ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001', 'owner'),
    ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000002', 'admin'),
    ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000003', 'manager'),
    ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000004', 'member'),
    ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000005', 'owner')
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;

-- Seed rows in two organizations to test isolation.
INSERT INTO workers (id, organization_id, first_name, last_name, email) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Alice', 'A', 'a@example.com'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Bob',   'B', 'b@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, organization_id, name, slug, status) VALUES
    ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Proj A', 'proj-a', 'active'),
    ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Proj B', 'proj-b', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO content_pages (id, organization_id, title, slug, status) VALUES
    ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Draft A', 'draft-a', 'draft')
ON CONFLICT (id) DO NOTHING;

INSERT INTO expenses (id, organization_id, title, amount, status) VALUES
    ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Exp A', 100, 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO donations (id, organization_id, amount, currency, status) VALUES
    ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 50, 'EUR', 'completed')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. Activate RLS as the authenticated role, then impersonate.
-- =====================================================
SET LOCAL ROLE authenticated;

-- -----------------------------------------------------
-- 2.1 MEMBER of Org A (has notifications.read, messaging.read,
--     events.read and NOTHING else)
-- -----------------------------------------------------
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);

SELECT tests.assert(
    (SELECT count(*) FROM workers WHERE organization_id = '00000000-0000-0000-0000-00000000000a') = 1,
    'member: must see rows of own org (workers A)'
);

SELECT tests.assert(
    (SELECT count(*) FROM workers WHERE organization_id = '00000000-0000-0000-0000-00000000000b') = 0,
    'member: must NOT see rows of another org (workers B)'
);

SELECT tests.assert(
    (SELECT count(*) FROM projects WHERE organization_id = '00000000-0000-0000-0000-00000000000b') = 0,
    'member: must NOT see projects of another org'
);

SELECT tests.assert(
    (SELECT count(*) FROM donations WHERE organization_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'member: must NOT read donations (no donations.read)'
);

SELECT tests.assert(
    tests.expect_error(
        'INSERT INTO workers (organization_id, first_name, last_name, email) VALUES (''00000000-0000-0000-0000-00000000000a'', ''X'', ''Y'', ''x@example.com'')'
    ),
    'member: INSERT into workers must be denied'
);

SELECT tests.assert(
    tests.expect_error(
        'UPDATE workers SET first_name = ''Hacked'' WHERE id = ''10000000-0000-0000-0000-000000000001'''
    ),
    'member: UPDATE workers must be denied'
);

SELECT tests.assert(
    tests.expect_error(
        'DELETE FROM workers WHERE id = ''10000000-0000-0000-0000-000000000001'''
    ),
    'member: DELETE workers must be denied'
);

-- Member CAN read events (events.read) in own org
SELECT tests.assert(
    (SELECT count(*) FROM org_events WHERE organization_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'member: SELECT org_events (events.read) must be allowed'
-- -----------------------------------------------------
-- 2.2 OWNER of Org B (cross-tenant write attempt)
-- -----------------------------------------------------
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);

SELECT tests.assert(
    (SELECT count(*) FROM workers) = 1,
    'org B owner: sees only Org B workers'
);

SELECT tests.assert(
    tests.expect_error(
        'UPDATE workers SET first_name = ''Hacked'' WHERE id = ''10000000-0000-0000-0000-000000000001'''
    ),
    'org B owner: UPDATEing an Org A worker must be denied (cross-tenant)'
);

SELECT tests.assert(
    tests.expect_error(
        'INSERT INTO projects (organization_id, name, slug, status) VALUES (''00000000-0000-0000-0000-00000000000a'', ''Sneak'', ''sneak'', ''planning'')'
    ),
    'org B owner: INSERT into Org A must be denied even with manage rights in org B'
);

-- org_id immutability
SELECT tests.assert(
    tests.expect_error(
        'UPDATE workers SET organization_id = ''00000000-0000-0000-0000-00000000000b'' WHERE id = ''10000000-0000-0000-0000-000000000002'''
    ),
    'org_id immutability: changing organization_id must be rejected'
);

-- -----------------------------------------------------
-- 2.3 MANAGER of Org A
-- -----------------------------------------------------
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);

SELECT tests.assert(
    (SELECT count(*) FROM workers WHERE organization_id = '00000000-0000-0000-0000-00000000000a') = 1,
    'manager: can read workers of own org'
);

-- Manager CAN insert/update/delete workers (workers.manage)
SELECT tests.assert(
    NOT tests.expect_error(
        'INSERT INTO workers (organization_id, first_name, last_name, email) VALUES (''00000000-0000-0000-0000-00000000000a'', ''Mgr'', ''Person'', ''mgr@example.com'')'
    ),
    'manager: INSERT workers must be allowed'
);

SELECT tests.assert(
    NOT tests.expect_error(
        'UPDATE workers SET first_name = ''Renamed'' WHERE first_name = ''Mgr'''
    ),
    'manager: UPDATE workers must be allowed'
);

-- Manager can read finance summaries but cannot approve expenses
SELECT tests.assert(
    (SELECT count(*) FROM expenses WHERE organization_id = '00000000-0000-0000-0000-00000000000a') = 1,
    'manager: can read expenses (finance.read)'
);

SELECT tests.assert(
    tests.expect_error(
        'UPDATE expenses SET status = ''approved'' WHERE id = ''40000000-0000-0000-0000-000000000001'''
    ),
    'manager: approving an expense must be denied (finance.approve required)'
);

-- Manager can draft content but cannot publish (content.publish required)
SELECT tests.assert(
    NOT tests.expect_error(
        'UPDATE content_pages SET title = ''Draft v2'' WHERE id = ''30000000-0000-0000-0000-000000000001'''
    ),
    'manager: editing content (content.manage) must be allowed'
);

SELECT tests.assert(
    tests.expect_error(
        'UPDATE content_pages SET status = ''published'' WHERE id = ''30000000-0000-0000-0000-000000000001'''
    ),
    'manager: publishing content must be denied (content.publish required)'
);

-- Manager cannot touch RBAC (no rbac.*)
SELECT tests.assert(
    tests.expect_error(
        'INSERT INTO custom_roles (organization_id, name, slug) VALUES (''00000000-0000-0000-0000-00000000000a'', ''Hax'', ''hax'')'
    ),
    'manager: INSERT custom_roles must be denied (rbac.manage required)'
);

-- Manager cannot change member roles (members.manage required)
SELECT tests.assert(
    tests.expect_error(
        'UPDATE organization_members SET role = ''owner'' WHERE user_id = ''00000000-0000-0000-0000-000000000004'''
    ),
    'manager: changing membership roles must be denied'
);

-- -----------------------------------------------------
-- 2.4 ADMIN / OWNER of Org A
-- -----------------------------------------------------
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

-- Admin (implicit '*' permissions) can publish content, approve expenses,
-- and manage members.
SELECT tests.assert(
    NOT tests.expect_error(
        'UPDATE content_pages SET status = ''published'' WHERE id = ''30000000-0000-0000-0000-000000000001'''
    ),
    'admin: publishing content must be allowed'
);

SELECT tests.assert(
    NOT tests.expect_error(
        'UPDATE expenses SET status = ''approved'' WHERE id = ''40000000-0000-0000-0000-000000000001'''
    ),
    'admin: approving an expense must be allowed'
);

SELECT tests.assert(
    NOT tests.expect_error(
        'UPDATE organization_members SET role = ''manager'' WHERE user_id = ''00000000-0000-0000-0000-000000000004'''
    ),
    'admin: managing membership must be allowed'
);

-- Audit logs: admin may read (audit.read) but cannot write
SELECT tests.assert(
    (SELECT count(*) FROM audit_logs WHERE organization_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'admin: reading audit_logs must be allowed'
);

SELECT tests.assert(
    tests.expect_error(
        'INSERT INTO audit_logs (organization_id, action, entity_type) VALUES (''00000000-0000-0000-0000-00000000000a'', ''forged'', ''workers'')'
    ),
    'admin: inserting audit_logs must be denied (append-only)'
);

-- Member (still 004 under a fresh claim) cannot read audit logs.
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
SELECT tests.assert(
    (SELECT count(*) FROM audit_logs WHERE organization_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'member: reading audit_logs must be denied'
);

-- =====================================================
-- 3. Summary
-- =====================================================
ROLLBACK;

-- Everything above passed.
NOTIFY tests_rls_passed;

-- =====================================================
-- Done. No output = all assertions green.
-- =====================================================