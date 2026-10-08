-- =====================================================
-- NGO OS - Distributed rate limiting & abuse prevention (audit Wave 0, item 3)
--
-- The previous limiter was an in-memory Map keyed on `x-forwarded-for`.
-- It reset on every deploy, was per-instance, and an attacker could rotate
-- spoofed IPs to bypass it. This migration moves the counter into Postgres:
--
--   rate_limit_counters     one fixed-window counter per (surface, identity),
--                           atomically consumed through
--                           `consume_rate_limit()` (a single UPSERT, safe
--                           across server instances and deploys).
--
-- Access model: the table has RLS enabled and NO policies, so anon and
-- authenticated roles can neither read nor write it. Only the service-role
-- client (used by the server-side limiter) may reach it through the
-- SECURITY DEFINER function below.
--
-- Production posture: CDN/WAF edge rules stay the first line of defense
-- (documented in docs/runbooks/deploy.md); this is the in-app second line.
-- =====================================================

-- -----------------------------------------------------
-- 1. Fixed-window counters (service-role only)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limit_counters (
    surface TEXT NOT NULL,
    identity TEXT NOT NULL,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hits INTEGER NOT NULL DEFAULT 0 CHECK (hits >= 0),
    PRIMARY KEY (surface, identity)
);

ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- Deliberate: no policies for anon/authenticated. The limiter is
-- infrastructure, not tenant data; only the service role may use it.
DROP POLICY IF EXISTS rate_limit_counters_service_only ON rate_limit_counters;

-- -----------------------------------------------------
-- 2. Atomic consume (single-statement UPSERT; no read-modify-write race)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
    p_surface TEXT,
    p_identity TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER
)
RETURNS TABLE (allowed BOOLEAN, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_hits INTEGER;
    v_window_started TIMESTAMPTZ;
    v_retry INTEGER;
BEGIN
    IF p_limit IS NULL OR p_limit < 1 OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
        RETURN QUERY SELECT FALSE, 60;
        RETURN;
    END IF;

    INSERT INTO rate_limit_counters AS c (surface, identity, window_started_at, hits)
    VALUES (p_surface, p_identity, NOW(), 1)
    ON CONFLICT (surface, identity) DO UPDATE
        SET hits = CASE
                WHEN c.window_started_at < NOW() - make_interval(secs => p_window_seconds) THEN 1
                ELSE c.hits + 1
            END,
            window_started_at = CASE
                WHEN c.window_started_at < NOW() - make_interval(secs => p_window_seconds) THEN NOW()
                ELSE c.window_started_at
            END
    RETURNING hits, window_started_at INTO v_hits, v_window_started;

    IF v_hits > p_limit THEN
        v_retry := GREATEST(
            1,
            CEIL(EXTRACT(EPOCH FROM (
                v_window_started + make_interval(secs => p_window_seconds) - NOW()
            ))::int)
        );
        RETURN QUERY SELECT FALSE, v_retry;
    END IF;

    RETURN QUERY SELECT TRUE, 0;
END;
$$;

COMMENT ON FUNCTION public.consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER) IS
    'Wave 0: atomic distributed fixed-window rate limiter. Service-role only.';

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- -----------------------------------------------------
-- 3. Housekeeping: drop stale windows opportunistically
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.prune_rate_limit_counters(p_older_than_seconds INTEGER DEFAULT 3600)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM rate_limit_counters
    WHERE window_started_at < NOW() - make_interval(secs => GREATEST(COALESCE(p_older_than_seconds, 3600), 60));
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_rate_limit_counters(INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prune_rate_limit_counters(INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.prune_rate_limit_counters(INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.prune_rate_limit_counters(INTEGER) TO service_role;
