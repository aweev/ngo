-- Phase 2 finance operations: exchange rates, cost allocation, two-step
-- approvals, donor linkage, and reproducible report snapshots.

-- -----------------------------------------------------
-- 1. Exchange rates (per org, per day — reconciliation converts here)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate DECIMAL(18,8) NOT NULL CHECK (rate > 0),
    rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source TEXT NOT NULL DEFAULT 'manual',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, from_currency, to_currency, rate_date)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup
    ON exchange_rates(organization_id, from_currency, to_currency, rate_date DESC);

-- -----------------------------------------------------
-- 2. Cost allocations (which grant paid for which expense share)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS cost_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL CHECK (amount >= 0),
    basis TEXT NOT NULL DEFAULT 'direct' CHECK (basis IN ('direct', 'indirect')),
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, expense_id, grant_id, basis)
);

CREATE INDEX IF NOT EXISTS idx_cost_allocations_grant
    ON cost_allocations(grant_id, basis);
CREATE INDEX IF NOT EXISTS idx_cost_allocations_expense
    ON cost_allocations(expense_id);

-- -----------------------------------------------------
-- 3. Approval trail (every decision, including first-of-two)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS expense_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    approver_id UUID,
    step INT NOT NULL DEFAULT 1 CHECK (step IN (1, 2)),
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_approvals_expense
    ON expense_approvals(expense_id, step);

-- -----------------------------------------------------
-- 4. Two-step status plus org threshold and donor linkage
-- -----------------------------------------------------
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_status_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_status_check
    CHECK (status IN ('pending', 'approved_first', 'approved', 'rejected', 'paid'));

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS expense_approval_threshold DECIMAL(15,2);

ALTER TABLE grants ADD COLUMN IF NOT EXISTS donor_id UUID REFERENCES donors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_grants_donor ON grants(donor_id);

ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS query_hash TEXT;

-- -----------------------------------------------------
-- 5. Triggers
-- -----------------------------------------------------
DROP TRIGGER IF EXISTS update_exchange_rates_updated_at ON exchange_rates;
-- exchange_rates is append-only by design (a correction is a new dated row).

DROP TRIGGER IF EXISTS trg_prevent_org_change ON exchange_rates;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON exchange_rates
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

DROP TRIGGER IF EXISTS trg_prevent_org_change ON cost_allocations;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON cost_allocations
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

DROP TRIGGER IF EXISTS trg_prevent_org_change ON expense_approvals;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON expense_approvals
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

-- -----------------------------------------------------
-- 6. RLS
-- -----------------------------------------------------
SELECT public.add_tenant_policies('exchange_rates', 'finance.read', 'finance.manage');
SELECT public.add_tenant_policies('cost_allocations', 'finance.read', 'finance.manage');
SELECT public.add_tenant_policies('expense_approvals', 'finance.read', 'finance.approve', 'finance.manage');
