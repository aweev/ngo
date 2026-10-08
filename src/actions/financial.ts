'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type { Budget, BudgetInsert, BudgetUpdate } from '@/types/domain/financial';

/** Get all budgets for the active organization. */
export async function getBudgets(): Promise<{ data: Budget[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('budgets')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load budgets. Please try again.' };
    return { data, error: null };
}

/** Create a budget. */
export async function createBudget(input: Omit<BudgetInsert, 'organization_id' | 'created_by'>): Promise<{ data: Budget | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('budgets')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            created_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[createBudget]', error.message);
        return { data: null, error: 'Unable to create budget. Please check the provided data.' };
    }

    revalidatePath('/admin/financial');
    return { data, error: null };
}

/** Update a budget (organization-scoped, cannot change organization). */
export async function updateBudget(id: string, input: BudgetUpdate): Promise<{ data: Budget | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of a budget.' };
    }
    // Phase 0: status transitions are approvals, not edits — require finance.approve.
    if (input.status !== undefined) {
        const approval = await authorizePermission(PERMISSIONS.finance.approve);
        if (!approval.ok) return { data: null, error: approval.error };
    }

    const { data, error } = await auth.context.supabase
        .from('budgets')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateBudget]', error.message);
        return { data: null, error: 'Unable to update budget. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Budget not found.' };

    revalidatePath('/admin/financial');
    return { data, error: null };
}

/** Delete a budget (organization-scoped). */
export async function deleteBudget(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteBudget]', error.message);
        return { error: 'Unable to delete budget. Please try again.' };
    }
    if (!data) return { error: 'Budget not found.' };

    revalidatePath('/admin/financial');
    return { error: null };
}

import type { Expense, ExpenseInsert, ExpenseUpdate } from '@/types/domain/financial';

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

/** Get all expenses for the active organization. */
export async function getExpenses(): Promise<{ data: Expense[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error: 'Unable to load expenses. Please try again.' };
    return { data, error: null };
}

/** Create an expense (always starts in pending state). */
export async function createExpense(input: Omit<ExpenseInsert, 'organization_id' | 'status'>): Promise<{ data: Expense | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('expenses')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            status: 'pending',
            submitted_by: auth.context.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[createExpense]', error.message);
        return { data: null, error: 'Unable to create expense. Please check the provided data.' };
    }

    revalidatePath('/admin/financial');
    return { data, error: null };
}

/** Update an expense (organization-scoped, cannot change organization). */
export async function updateExpense(id: string, input: ExpenseUpdate): Promise<{ data: Expense | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (input.organization_id && input.organization_id !== auth.organizationId) {
        return { data: null, error: 'You cannot change the organization of an expense.' };
    }

    const { data, error } = await auth.context.supabase
        .from('expenses')
        .update(input)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[updateExpense]', error.message);
        return { data: null, error: 'Unable to update expense. Please check the provided data.' };
    }
    if (!data) return { data: null, error: 'Expense not found.' };

    revalidatePath('/admin/financial');
    return { data, error: null };
}

/**
 * Allowable-cost rule shape stored on grants.allowable_costs. Empty object
 * means no restriction — the grant imposes nothing.
 */
interface AllowableCosts {
    categories?: string[];
    max_per_expense?: number;
}

function allowableViolation(
    grantRef: string,
    allowable: AllowableCosts,
    category: string | null,
    amount: number,
): string | null {
    if (allowable.categories && allowable.categories.length > 0) {
        if (!category || !allowable.categories.includes(category)) {
            return `${grantRef} only allows: ${allowable.categories.join(', ')}.`;
        }
    }
    if (typeof allowable.max_per_expense === 'number' && amount > allowable.max_per_expense) {
        return `${grantRef} caps a single expense at ${allowable.max_per_expense}.`;
    }
    return null;
}

/**
 * Approve an expense (requires finance.approve).
 * Self-approval is rejected — the submitter can never approve their own expense.
 *
 * Phase 2: two-step approvals above the org threshold, allowable-cost
 * enforcement against linked grants, and a decision trail in
 * expense_approvals. Step 1 moves pending -> approved_first; a DIFFERENT
 * approver moves approved_first -> approved.
 */
export async function approveExpense(id: string, reason?: string): Promise<{ data: Expense | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.approve);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: expense } = await auth.context.supabase
        .from('expenses')
        .select('id, amount, currency, category, status, submitted_by, fund_id')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (!expense) return { data: null, error: 'Expense not found.' };
    if (expense.submitted_by === auth.context.userId) {
        return { data: null, error: 'You cannot approve an expense you submitted.' };
    }
    if (expense.status !== 'pending' && expense.status !== 'approved_first') {
        return { data: null, error: `Only pending expenses can be approved (current: ${expense.status}).` };
    }

    // Allowable-cost enforcement: every grant behind the linked fund must
    // permit this category and amount.
    if (expense.fund_id) {
        const { data: grants } = await auth.context.supabase
            .from('grants')
            .select('grant_reference, title, allowable_costs')
            .eq('organization_id', auth.organizationId)
            .eq('fund_id', expense.fund_id);
        for (const g of (grants ?? []) as Array<{ grant_reference: string | null; title: string; allowable_costs: AllowableCosts }>) {
            const violation = allowableViolation(
                g.grant_reference || g.title,
                (g.allowable_costs ?? {}) as AllowableCosts,
                (expense.category as string | null) ?? null,
                Number(expense.amount),
            );
            if (violation) return { data: null, error: `Blocked by grant terms: ${violation}` };
        }
    }

    const { data: org } = await auth.context.supabase
        .from('organizations')
        .select('expense_approval_threshold')
        .eq('id', auth.organizationId)
        .maybeSingle();
    const threshold = (org as { expense_approval_threshold: number | null } | null)?.expense_approval_threshold;
    const needsTwoSteps = threshold !== null && threshold !== undefined && Number(expense.amount) > Number(threshold);

    let nextStatus: string = 'approved';
    let step = 1;
    if (needsTwoSteps && expense.status === 'pending') {
        nextStatus = 'approved_first';
    } else if (needsTwoSteps && expense.status === 'approved_first') {
        // The second approver must differ from the first.
        const { data: first } = await auth.context.supabase
            .from('expense_approvals')
            .select('approver_id')
            .eq('expense_id', id)
            .eq('organization_id', auth.organizationId)
            .eq('step', 1)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if ((first as { approver_id: string | null } | null)?.approver_id === auth.context.userId) {
            return { data: null, error: 'A second, different approver is required above the threshold.' };
        }
        step = 2;
        nextStatus = 'approved';
    }

    const patch: Record<string, unknown> = { status: nextStatus, approved_by: auth.context.userId };
    if (nextStatus === 'approved') patch.approved_at = new Date().toISOString();

    const { data, error } = await auth.context.supabase
        .from('expenses')
        .update(patch)
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[approveExpense]', error.message);
        return { data: null, error: 'Unable to approve expense. Please try again.' };
    }
    if (!data) return { data: null, error: 'Expense not found.' };

    await auth.context.supabase.from('expense_approvals').insert({
        organization_id: auth.organizationId,
        expense_id: id,
        approver_id: auth.context.userId,
        step,
        decision: 'approved',
        reason: reason?.trim() || null,
    });

    revalidatePath('/admin/financial');
    return { data, error: null };
}

/** Reject an expense (requires finance.approve). Works from pending or approved_first. */
export async function rejectExpense(id: string, reason?: string): Promise<{ data: Expense | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.approve);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: expense } = await auth.context.supabase
        .from('expenses')
        .select('id, status')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!expense) return { data: null, error: 'Expense not found.' };
    if (expense.status !== 'pending' && expense.status !== 'approved_first') {
        return { data: null, error: `Only pending expenses can be rejected (current: ${expense.status}).` };
    }

    const { data, error } = await auth.context.supabase
        .from('expenses')
        .update({ status: 'rejected', approved_by: auth.context.userId })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[rejectExpense]', error.message);
        return { data: null, error: 'Unable to reject expense. Please try again.' };
    }
    if (!data) return { data: null, error: 'Expense not found.' };

    await auth.context.supabase.from('expense_approvals').insert({
        organization_id: auth.organizationId,
        expense_id: id,
        approver_id: auth.context.userId,
        step: expense.status === 'approved_first' ? 2 : 1,
        decision: 'rejected',
        reason: reason?.trim() || null,
    });

    revalidatePath('/admin/financial');
    return { data, error: null };
}

/** Delete an expense (organization-scoped). */
export async function deleteExpense(id: string): Promise<{ error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[deleteExpense]', error.message);
        return { error: 'Unable to delete expense. Please try again.' };
    }
    if (!data) return { error: 'Expense not found.' };

    revalidatePath('/admin/financial');
    return { error: null };
}

import type { GrantAllocation } from '@/types/domain/financial';

/**
 * Grant balance report built ONLY from real grants, funds, and expenses.
 * Phase 0 fix: the previous version synthesized funder names, grant codes,
 * and fund types from budget rows — plausible-looking fiction. An org with
 * no grants now honestly returns an empty report instead of fake data.
 */
export async function getGrantBalanceReport(): Promise<{ data: { totalRestricted: number; totalUnrestricted: number; allocations: GrantAllocation[] } | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const [{ data: grants }, { data: funds }, { data: expenses }] = await Promise.all([
        auth.context.supabase.from('grants').select('*').eq('organization_id', auth.organizationId),
        auth.context.supabase.from('funds').select('*').eq('organization_id', auth.organizationId),
        auth.context.supabase
            .from('expenses')
            .select('fund_id, amount, status')
            .eq('organization_id', auth.organizationId)
            .in('status', ['approved', 'paid']),
    ]);

    const fundById = new Map((funds || []).map((f) => [f.id, f]));
    const spentByFund = new Map<string, number>();
    for (const e of expenses || []) {
        if (!e.fund_id) continue;
        spentByFund.set(e.fund_id, (spentByFund.get(e.fund_id) ?? 0) + (Number(e.amount) || 0));
    }

    const allocations: GrantAllocation[] = (grants || []).map((g) => {
        const fund = g.fund_id ? fundById.get(g.fund_id) : undefined;
        // DB fund types -> report fund types. Grants without a linked fund
        // default to unrestricted AND are visible as such, so finance links them.
        const fundType = !fund || fund.fund_type === 'unrestricted'
            ? 'unrestricted'
            : fund.fund_type === 'permanently_restricted'
                ? 'endowment'
                : 'restricted';
        const committed = Number(g.amount_committed) || 0;
        const spent = g.fund_id ? (spentByFund.get(g.fund_id) ?? 0) : 0;
        return {
            id: g.id,
            organization_id: g.organization_id,
            grant_name: g.title,
            funder_name: g.grantor_name,
            grant_code: g.grant_reference || g.id.substring(0, 8),
            total_grant_amount: committed,
            currency: g.currency || fund?.currency || 'EUR',
            fund_type: fundType as GrantAllocation['fund_type'],
            start_date: g.start_date || g.created_at,
            end_date: g.end_date || g.created_at,
            allocated_amount: committed,
            // May go negative: that is a real overspend signal, not hidden.
            remaining_balance: committed - spent,
            created_at: g.created_at,
        };
    });

    const totalRestricted = allocations
        .filter((a) => a.fund_type === 'restricted' || a.fund_type === 'endowment')
        .reduce((sum, a) => sum + a.total_grant_amount, 0);
    const totalUnrestricted = allocations
        .filter((a) => a.fund_type === 'unrestricted')
        .reduce((sum, a) => sum + a.total_grant_amount, 0);

    return {
        data: {
            totalRestricted,
            totalUnrestricted,
            allocations,
        },
        error: null,
    };
}


