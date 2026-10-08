-- Phase 0 finance truth: single-currency guard, spent rollup, currency match.
-- No new tables. All statements are idempotent and rerunnable.

-- 1. Organization default currency used as the single-currency anchor.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_currency TEXT NOT NULL DEFAULT 'EUR';

-- Backfill the anchor from each org most used money currency, EUR when none.
UPDATE organizations o
SET default_currency = COALESCE((
    SELECT s.currency
    FROM (
        SELECT currency, COUNT(*) AS n FROM budgets WHERE organization_id = o.id GROUP BY currency
        UNION ALL
        SELECT currency, COUNT(*) AS n FROM expenses WHERE organization_id = o.id GROUP BY currency
        UNION ALL
        SELECT currency, COUNT(*) AS n FROM funds WHERE organization_id = o.id GROUP BY currency
        UNION ALL
        SELECT currency, COUNT(*) AS n FROM grants WHERE organization_id = o.id GROUP BY currency
    ) s
    GROUP BY s.currency
    ORDER BY SUM(s.n) DESC
    LIMIT 1
), 'EUR');

-- 2. Expense currency must match its linked line, budget, or fund.
-- Unlinked expenses must match the org default currency.
CREATE OR REPLACE FUNCTION enforce_expense_currency() RETURNS trigger AS $$
DECLARE
    want TEXT;
BEGIN
    IF NEW.budget_line_id IS NOT NULL THEN
        SELECT currency INTO want FROM budget_lines WHERE id = NEW.budget_line_id;
        IF want IS NOT NULL AND NEW.currency <> want THEN
            RAISE EXCEPTION 'Expense currency % must match its budget line currency %', NEW.currency, want;
        END IF;
    ELSIF NEW.budget_id IS NOT NULL THEN
        SELECT currency INTO want FROM budgets WHERE id = NEW.budget_id;
        IF want IS NOT NULL AND NEW.currency <> want THEN
            RAISE EXCEPTION 'Expense currency % must match its budget currency %', NEW.currency, want;
        END IF;
    ELSIF NEW.fund_id IS NOT NULL THEN
        SELECT currency INTO want FROM funds WHERE id = NEW.fund_id;
        IF want IS NOT NULL AND NEW.currency <> want THEN
            RAISE EXCEPTION 'Expense currency % must match its fund currency %', NEW.currency, want;
        END IF;
    ELSE
        SELECT default_currency INTO want FROM organizations WHERE id = NEW.organization_id;
        IF want IS NOT NULL AND NEW.currency <> want THEN
            RAISE EXCEPTION 'Expense currency % must match the organization default %', NEW.currency, want;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_expense_currency ON expenses;
CREATE TRIGGER trg_enforce_expense_currency
    BEFORE INSERT OR UPDATE OF currency, budget_id, budget_line_id, fund_id ON expenses
    FOR EACH ROW EXECUTE FUNCTION enforce_expense_currency();

-- 3. Budget line currency must match its parent budget currency.
CREATE OR REPLACE FUNCTION enforce_budget_line_currency() RETURNS trigger AS $$
DECLARE
    want TEXT;
BEGIN
    SELECT currency INTO want FROM budgets WHERE id = NEW.budget_id;
    IF want IS NOT NULL AND NEW.currency <> want THEN
        RAISE EXCEPTION 'Budget line currency % must match its budget currency %', NEW.currency, want;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_budget_line_currency ON budget_lines;
CREATE TRIGGER trg_enforce_budget_line_currency
    BEFORE INSERT OR UPDATE OF currency, budget_id ON budget_lines
    FOR EACH ROW EXECUTE FUNCTION enforce_budget_line_currency();

-- 4. Keep budget_lines.spent_amount honest: approved and paid expenses only.
CREATE OR REPLACE FUNCTION recalc_budget_line_spent(p_line_id UUID) RETURNS void AS $$
BEGIN
    UPDATE budget_lines
    SET spent_amount = COALESCE((
        SELECT SUM(amount) FROM expenses
        WHERE budget_line_id = p_line_id AND status IN ('approved', 'paid')
    ), 0),
    updated_at = NOW()
    WHERE id = p_line_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_recalc_line_spent() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.budget_line_id IS NOT NULL THEN
            PERFORM recalc_budget_line_spent(OLD.budget_line_id);
        END IF;
        RETURN OLD;
    END IF;
    IF NEW.budget_line_id IS NOT NULL THEN
        PERFORM recalc_budget_line_spent(NEW.budget_line_id);
    END IF;
    IF TG_OP = 'UPDATE'
        AND OLD.budget_line_id IS DISTINCT FROM NEW.budget_line_id
        AND OLD.budget_line_id IS NOT NULL THEN
        PERFORM recalc_budget_line_spent(OLD.budget_line_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expenses_recalc_spent ON expenses;
CREATE TRIGGER trg_expenses_recalc_spent
    AFTER INSERT OR UPDATE OF amount, status, budget_line_id OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION trg_recalc_line_spent();

-- 5. One-time backfill so existing lines reflect approved and paid spend.
UPDATE budget_lines bl
SET spent_amount = COALESCE((
    SELECT SUM(e.amount) FROM expenses e
    WHERE e.budget_line_id = bl.id AND e.status IN ('approved', 'paid')
), 0);
