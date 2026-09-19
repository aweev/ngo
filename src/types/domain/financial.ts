export type BudgetPeriodType = 'annual' | 'quarterly' | 'monthly' | 'project';
export type BudgetStatus = 'draft' | 'approved' | 'active' | 'closed';
export type ExpenseStatus = 'pending' | 'approved' | 'rejected' | 'paid';

export interface Budget {
    id: string;
    organization_id: string;
    name: string;
    fiscal_year: number | null;
    period_type: BudgetPeriodType;
    total_amount: number;
    currency: string;
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

export type BudgetInsert = Omit<Budget, 'id' | 'created_at' | 'updated_at'>;
export type BudgetUpdate = Partial<BudgetInsert>;

export type ExpenseInsert = Omit<Expense, 'id' | 'created_at' | 'updated_at'>;
export type ExpenseUpdate = Partial<ExpenseInsert>;
