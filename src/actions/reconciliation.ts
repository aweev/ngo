'use server';

import { z } from 'zod';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';
import { convertAmount, type RateRow } from '@/lib/fx';

/**
 * Cost allocation + reconciliation (Phase 2.1).
 *
 * Allocation rule: shares of ONE expense across grants must sum exactly to
 * the expense amount, in the expense currency. The reconcile view converts
 * everything into the org default currency through dated rates — amounts
 * without a rate are listed under "missing rates", never converted by guess.
 */

const allocationSchema = z.object({
    expense_id: z.string().uuid(),
    shares: z.array(z.object({
        grant_id: z.string().uuid(),
        amount: z.number().nonnegative(),
        basis: z.enum(['direct', 'indirect']).default('direct'),
    })).min(1).max(20),
});

export async function allocateExpenseCost(input: unknown) {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const parsed = allocationSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Grant shares are required.' };

    const { data: expense } = await auth.context.supabase
        .from('expenses')
        .select('id, amount, currency, status')
        .eq('id', parsed.data.expense_id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!expense) return { data: null, error: 'Expense not found.' };

    const total = parsed.data.shares.reduce((s, x) => s + x.amount, 0);
    if (Math.abs(total - Number((expense as { amount: number }).amount)) > 0.005) {
        return { data: null, error: `Shares sum to ${total.toFixed(2)} but the expense is ${Number((expense as { amount: number }).amount).toFixed(2)}.` };
    }

    const grantIds = [...new Set(parsed.data.shares.map((s) => s.grant_id))];
    const { data: grants } = await auth.context.supabase
        .from('grants')
        .select('id, currency')
        .eq('organization_id', auth.organizationId)
        .in('id', grantIds);
    const currencyByGrant = new Map(((grants ?? []) as Array<{ id: string; currency: string }>).map((g) => [g.id, g.currency]));
    for (const share of parsed.data.shares) {
        const cur = currencyByGrant.get(share.grant_id);
        if (!cur) return { data: null, error: 'One of the grants was not found.' };
        if (cur !== (expense as { currency: string }).currency) {
            return { data: null, error: 'All grants must use the expense currency (convert first in a later phase).' };
        }
    }

    await auth.context.supabase
        .from('cost_allocations')
        .delete()
        .eq('expense_id', parsed.data.expense_id)
        .eq('organization_id', auth.organizationId);

    const rows = parsed.data.shares.map((s) => ({
        organization_id: auth.organizationId,
        expense_id: parsed.data.expense_id,
        grant_id: s.grant_id,
        amount: s.amount,
        basis: s.basis,
        created_by: auth.context.userId,
    }));
    const { data, error } = await auth.context.supabase.from('cost_allocations').insert(rows).select('*');
    if (error) return { data: null, error: 'Unable to save the allocation.' };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'finance.cost_allocated',
        entityType: 'expenses',
        entityId: parsed.data.expense_id,
        newValues: { shares: parsed.data.shares.length, total },
        correlationId: newCorrelationId(),
    });
    return { data: data ?? [], error: null };
}

export interface ReconcileLine {
    budget_id: string;
    budget_name: string;
    line_id: string;
    category: string;
    currency: string;
    allocated: number;
    spent: number;
    spent_in_org_currency: number | null;
    remaining: number;
}

export interface ReconcileGrant {
    grant_id: string;
    grant_title: string;
    funder: string;
    currency: string;
    committed: number;
    spent: number;
    spent_in_org_currency: number | null;
    remaining: number;
    allocated_via_splits: number;
}

/**
 * One screen of truth: budget lines, grants, awaiting approvals, unlinked
 * spend, missing receipts, and missing FX rates. Read-only finance.read.
 */
export async function getReconciliation() {
    const auth = await authorizePermission(PERMISSIONS.finance.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const [orgRes, budgetsRes, linesRes, expensesRes, grantsRes, ratesRes, allocsRes] = await Promise.all([
        auth.context.supabase.from('organizations').select('default_currency').eq('id', auth.organizationId).maybeSingle(),
        auth.context.supabase.from('budgets').select('id, name').eq('organization_id', auth.organizationId).order('created_at', { ascending: false }),
        auth.context.supabase.from('budget_lines').select('*').eq('organization_id', auth.organizationId),
        auth.context.supabase.from('expenses').select('*').eq('organization_id', auth.organizationId).order('created_at', { ascending: false }).limit(500),
        auth.context.supabase.from('grants').select('*').eq('organization_id', auth.organizationId),
        auth.context.supabase.from('exchange_rates').select('from_currency, to_currency, rate, rate_date').eq('organization_id', auth.organizationId).order('rate_date', { ascending: false }).limit(500),
        auth.context.supabase.from('cost_allocations').select('*').eq('organization_id', auth.organizationId),
    ]);

    const orgCurrency = ((orgRes.data as { default_currency: string } | null)?.default_currency) || 'EUR';
    const rates = ((ratesRes.data ?? []) as RateRow[]);
    const today = new Date().toISOString().slice(0, 10);
    const missingRates = new Set<string>();

    const toOrg = (amount: number, currency: string, dateRef: string): number | null => {
        if (currency === orgCurrency) return amount;
        const v = convertAmount(amount, currency, orgCurrency, rates, dateRef);
        if (v === null) missingRates.add(`${currency}→${orgCurrency}`);
        return v;
    };

    const budgetName = new Map(((budgetsRes.data ?? []) as Array<{ id: string; name: string }>).map((b) => [b.id, b.name]));
    const expenseList = ((expensesRes.data ?? []) as Array<Record<string, unknown>>);
    const spentByLine = new Map<string, number>();
    for (const e of expenseList) {
        if ((e.status === 'approved' || e.status === 'paid') && e.budget_line_id) {
            spentByLine.set(e.budget_line_id as string, (spentByLine.get(e.budget_line_id as string) ?? 0) + Number(e.amount));
        }
    }

    const lines: ReconcileLine[] = (((linesRes.data ?? []) as Array<Record<string, unknown>>)).map((l) => {
        const spent = Number(l.spent_amount) || spentByLine.get(l.id as string) || 0;
        const allocated = Number(l.allocated_amount) || 0;
        return {
            budget_id: l.budget_id as string,
            budget_name: budgetName.get(l.budget_id as string) ?? '—',
            line_id: l.id as string,
            category: (l.category as string) ?? '',
            currency: (l.currency as string) ?? orgCurrency,
            allocated,
            spent,
            spent_in_org_currency: toOrg(spent, (l.currency as string) ?? orgCurrency, today),
            remaining: allocated - spent,
        };
    });

    const allocByGrant = new Map<string, number>();
    for (const a of ((allocsRes.data ?? []) as Array<{ grant_id: string; amount: number }>)) {
        allocByGrant.set(a.grant_id, (allocByGrant.get(a.grant_id) ?? 0) + Number(a.amount));
    }
    const spentByFund = new Map<string, number>();
    for (const e of expenseList) {
        if ((e.status === 'approved' || e.status === 'paid') && e.fund_id) {
            spentByFund.set(e.fund_id as string, (spentByFund.get(e.fund_id as string) ?? 0) + Number(e.amount));
        }
    }

    const grantRows = ((grantsRes.data ?? []) as Array<Record<string, unknown>>);
    const grantList: ReconcileGrant[] = grantRows.map((g) => {
        const committed = Number(g.amount_committed) || 0;
        const fundId = g.fund_id as string | null;
        const spent = fundId ? (spentByFund.get(fundId) ?? 0) : 0;
        return {
            grant_id: g.id as string,
            grant_title: (g.title as string) ?? '',
            funder: (g.grantor_name as string) ?? '',
            currency: (g.currency as string) ?? orgCurrency,
            committed,
            spent,
            spent_in_org_currency: toOrg(spent, (g.currency as string) ?? orgCurrency, today),
            remaining: committed - spent,
            allocated_via_splits: allocByGrant.get(g.id as string) ?? 0,
        };
    });

    const awaiting = expenseList.filter((e) => e.status === 'pending' || e.status === 'approved_first');
    const unlinked = expenseList.filter((e) => !e.fund_id && (e.status === 'approved' || e.status === 'paid'));
    const missingReceipts = expenseList.filter(
        (e) => (e.status === 'approved' || e.status === 'paid') && !e.receipt_url,
    );

    return {
        data: {
            org_currency: orgCurrency,
            lines,
            grants: grantList,
            awaiting: awaiting.length,
            awaiting_rows: awaiting.slice(0, 50),
            unlinked_count: unlinked.length,
            unlinked_rows: unlinked.slice(0, 50),
            missing_receipts: missingReceipts.slice(0, 50),
            missing_rates: [...missingRates],
        },
        error: null,
    };
}
