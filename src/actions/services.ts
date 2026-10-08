'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';
import { createReferralRecord, createServiceRecord } from '@/lib/field-records';

/**
 * Services-delivered and referral actions (Phase 1).
 * logService is the 3-tap field flow; idempotency keys make offline
 * replays and double-taps safe.
 */

export async function logService(input: unknown) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const result = await createServiceRecord(auth.context.supabase, {
        organizationId: auth.organizationId,
        userId: auth.context.userId,
    }, input);
    if (!result.error) revalidatePath('/[locale]/field', 'page');
    return result;
}

export async function getServices(beneficiaryId?: string, limit = 50) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.read);
    if (!auth.ok) return { data: null, error: auth.error };
    let query = auth.context.supabase
        .from('services')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('delivered_at', { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 200));
    if (beneficiaryId) query = query.eq('beneficiary_id', beneficiaryId);
    const { data, error } = await query;
    if (error) return { data: null, error: 'Unable to load services.' };
    return { data: data ?? [], error: null };
}

export async function createReferral(input: unknown) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const result = await createReferralRecord(auth.context.supabase, {
        organizationId: auth.organizationId,
        userId: auth.context.userId,
    }, input);
    if (!result.error) revalidatePath('/[locale]/field', 'page');
    return result;
}

export async function getReferrals(status?: string, limit = 50, beneficiaryId?: string) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.read);
    if (!auth.ok) return { data: null, error: auth.error };
    let query = auth.context.supabase
        .from('referrals')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 200));
    if (status) query = query.eq('status', status);
    if (beneficiaryId) query = query.eq('beneficiary_id', beneficiaryId);
    const { data, error } = await query;
    if (error) return { data: null, error: 'Unable to load referrals.' };
    return { data: data ?? [], error: null };
}

const referralStatusSchema = z.object({
    status: z.enum(['open', 'accepted', 'completed', 'closed', 'expired']),
});

/** Advances a referral through its follow-up lifecycle. */
export async function updateReferralStatus(id: string, input: unknown) {
    const auth = await authorizePermission(PERMISSIONS.beneficiaries.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    const parsed = referralStatusSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid referral status.' };
    const { data, error } = await auth.context.supabase
        .from('referrals')
        .update({ status: parsed.data.status })
        .eq('id', id)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .maybeSingle();
    if (error || !data) return { data: null, error: 'Referral not found.' };
    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.context.userId,
        action: 'referral.status_changed',
        entityType: 'referrals',
        entityId: id,
        newValues: { status: parsed.data.status },
        correlationId: newCorrelationId(),
    });
    revalidatePath('/[locale]/field', 'page');
    return { data, error: null };
}
