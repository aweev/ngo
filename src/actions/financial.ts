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
 * Approve an expense (requires finance.approve).
 * Self-approval is rejected â€” the submitter can never approve their own expense.
 */
export async function approveExpense(id: string): Promise<{ data: Expense | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.approve);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: expense } = await auth.context.supabase
        .from('expenses')
        .select('id, submitted_by')
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();

    if (!expense) return { data: null, error: 'Expense not found.' };
    if (expense.submitted_by === auth.context.userId) {
        return { data: null, error: 'You cannot approve an expense you submitted.' };
    }

    const { data, error } = await auth.context.supabase
        .from('expenses')
        .update({ status: 'approved', approved_by: auth.context.userId })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('[approveExpense]', error.message);
        return { data: null, error: 'Unable to approve expense. Please try again.' };
    }
    if (!data) return { data: null, error: 'Expense not found.' };

    revalidatePath('/admin/financial');
    return { data, error: null };
}

/** Reject an expense (requires finance.approve). */
export async function rejectExpense(id: string): Promise<{ data: Expense | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.finance.approve);
    if (!auth.ok) return { data: null, error: auth.error };

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

