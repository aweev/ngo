export type BudgetPeriodType = 'annual' | 'quarterly' | 'monthly' | 'project';
export type BudgetStatus = 'draft' | 'approved' | 'active' | 'closed';
export type ExpenseStatus = 'pending' | 'approved_first' | 'approved' | 'rejected' | 'paid';
export type FundType = 'restricted' | 'unrestricted' | 'endowment';

export interface Budget {
    id: string;
    organization_id: string;
    name: string;
    fiscal_year: number | null;
    period_type: BudgetPeriodType;
    total_amount: number;
    currency: string;
    fund_type?: FundType;
    grant_id?: string | null;
    status: BudgetStatus;
    project_id: string | null;
    approved_by: string | null;
    approved_at: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface BudgetLine {
    id: string;
    organization_id: string;
    budget_id: string;
    category: string;
    description: string | null;
    allocated_amount: number;
    spent_amount: number;
    currency: string;
    grant_line_item_code?: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface Expense {
    id: string;
    organization_id: string;
    title: string;
    description: string | null;
    amount: number;
    currency: string;
    original_currency?: string | null;
    fx_rate_to_usd?: number | null;
    fund_type?: FundType;
    grant_id?: string | null;
    grant_line_item_id?: string | null;
    category: string | null;
    budget_id: string | null;
    budget_line_id: string | null;
    project_id: string | null;
    status: ExpenseStatus;
    receipt_url: string | null;
    paid_at: string | null;
    vendor: string | null;
    submitted_by: string | null;
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface GrantAllocation {
    id: string;
    organization_id: string;
    grant_name: string;
    funder_name: string;
    grant_code: string;
    total_grant_amount: number;
    currency: string;
    fund_type: FundType;
    start_date: string;
    end_date: string;
    allocated_amount: number;
    remaining_balance: number;
    created_at: string;
}

export type BudgetInsert = Omit<Budget, 'id' | 'created_at' | 'updated_at'>;
export type BudgetUpdate = Partial<BudgetInsert>;

export type ExpenseInsert = Omit<Expense, 'id' | 'created_at' | 'updated_at'>;
export type ExpenseUpdate = Partial<ExpenseInsert>;
