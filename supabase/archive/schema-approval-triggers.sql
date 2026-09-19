-- =====================================================
-- NGO OS - Permission-Gated Status Transitions (Phase 2)
-- =====================================================
-- RLS controls which rows a role may touch; these triggers control WHICH
-- kind of change is allowed, because triggers alone can compare OLD vs NEW
-- while RLS WITHOUT CHECK expressions cannot.
--
--   * content_pages: entering or leaving 'published' requires
--     content.publish. (A manager with content.manage can draft/edit but
--     cannot publish or unpublish.)
--   * expenses: changing status (pending -> approved/rejected/paid)
--     requires finance.manage OR finance.approve.
--   * budgets:   changing status (draft -> approved -> active/closed)
--     requires finance.manage OR finance.approve.
--
-- These are the database half of the policy; the Server Actions enforce
-- the same rule via the guard layer.

CREATE OR REPLACE FUNCTION public.enforce_content_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND (NEW.status = 'published' OR OLD.status = 'published')
       AND NOT public.user_has_permission(NEW.organization_id, 'content.publish') THEN
        RAISE EXCEPTION 'Requires content.publish to publish or unpublish content.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_content_publish ON content_pages;
CREATE TRIGGER trg_enforce_content_publish
    BEFORE UPDATE ON content_pages
    FOR EACH ROW EXECUTE FUNCTION public.enforce_content_publish();

CREATE OR REPLACE FUNCTION public.enforce_expense_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (public.user_has_permission(NEW.organization_id, 'finance.manage')
             OR public.user_has_permission(NEW.organization_id, 'finance.approve')) THEN
        RAISE EXCEPTION 'Requires finance.manage or finance.approve to change expense status.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_expense_approval ON expenses;
CREATE TRIGGER trg_enforce_expense_approval
    BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION public.enforce_expense_approval();

CREATE OR REPLACE FUNCTION public.enforce_budget_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (public.user_has_permission(NEW.organization_id, 'finance.manage')
             OR public.user_has_permission(NEW.organization_id, 'finance.approve')) THEN
        RAISE EXCEPTION 'Requires finance.manage or finance.approve to change budget status.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_budget_approval ON budgets;
CREATE TRIGGER trg_enforce_budget_approval
    BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION public.enforce_budget_approval();

-- =====================================================
-- Done.
-- =====================================================