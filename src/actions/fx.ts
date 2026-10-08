'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';

/**
 * Exchange rates + finance settings (Phase 2.1).
 * Rates are dated rows: a correction is a NEW row, never an edit of history.
 * Reconciliation converts through these — no rate, no conversion, no guessing.
 */

const rateSchema = z.object({
    from_currency: z.string().trim().length(3).transform((s) => s.toUpperCase()),
    to_currency: z.string().trim().length(3).transform((s) => s.toUpperCase()),
    rate: z.number().positive().max(1000000),
    rate_date: z.string().date(),
    source: z.string().trim().max(80).default('manual'),
});

export async function getExchangeRates(limit = 100) {
    const auth = await authorizePermission(PERMISSIONS.finance.read);
    if (!auth.ok) return { data: null, error: auth.error };
    const { data, error } = await auth.context.supabase
        .from('exchange_rates')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('rate_date', { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 500));
    if (error) return { data: null, error: 'Unable to load exchange rates.' };
    return { data: data ?? [], error: null };
}

/** Upserts one dated rate (finance.manage). Same day + pair replaces the row. */
export async function setExchangeRate(input: unknown) {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const parsed = rateSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Currency codes (3 letters), a positive rate, and a date are required.' };
    if (parsed.data.from_currency === parsed.data.to_currency) {
        return { data: null, error: 'From and to currencies must differ.' };
    }
    const v = parsed.data;
    const { data, error } = await auth.context.supabase
        .from('exchange_rates')
        .upsert({
            organization_id: auth.organizationId,
            from_currency: v.from_currency,
            to_currency: v.to_currency,
            rate: v.rate,
            rate_date: v.rate_date,
            source: v.source,
            created_by: auth.context.userId,
        }, { onConflict: 'organization_id,from_currency,to_currency,rate_date' })
        .select('*')
        .single();
    if (error) return { data: null, error: 'Unable to save the exchange rate.' };
    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'fx.rate_set',
        entityType: 'exchange_rates',
        entityId: (data as { id: string }).id,
        newValues: { pair: `${v.from_currency}/${v.to_currency}`, rate: v.rate, date: v.rate_date },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/admin/financial');
    return { data, error: null };
}

const settingsSchema = z.object({
    default_currency: z.string().trim().length(3).transform((s) => s.toUpperCase()).optional(),
    expense_approval_threshold: z.number().nonnegative().nullable().optional(),
});

/** Org finance settings: reporting currency + two-step approval threshold. */
export async function getFinanceSettings() {
    const auth = await authorizePermission(PERMISSIONS.finance.read);
    if (!auth.ok) return { data: null, error: auth.error };
    const { data, error } = await auth.context.supabase
        .from('organizations')
        .select('default_currency, expense_approval_threshold')
        .eq('id', auth.organizationId)
        .maybeSingle();
    if (error || !data) return { data: null, error: 'Unable to load finance settings.' };
    return { data, error: null };
}

export async function updateFinanceSettings(input: unknown) {
    const auth = await authorizePermission(PERMISSIONS.finance.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid finance settings.' };
    const { data, error } = await auth.context.supabase
        .from('organizations')
        .update(parsed.data)
        .eq('id', auth.organizationId)
        .select('default_currency, expense_approval_threshold')
        .maybeSingle();
    if (error || !data) return { data: null, error: 'Unable to save finance settings.' };
    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'finance.settings_updated',
        entityType: 'organizations',
        entityId: auth.organizationId,
        newValues: parsed.data as Record<string, unknown>,
        correlationId: newCorrelationId(),
    });
    revalidatePath('/admin/financial');
    return { data, error: null };
}
