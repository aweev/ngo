import type { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Recurring-billing handler (P0-4): `invoice.paid` / `invoice.payment_failed`
 * create one donation row per invoice so monthly revenue is never silent.
 * Idempotent on `stripe_invoice_id` (Stripe retries redeliver the same id).
 */

export type InvoiceOutcome =
    | { kind: 'created'; donationId: string }
    | { kind: 'duplicate' }
    | { kind: 'unmatched' }
    | { kind: 'failed'; message: string };

/**
 * The service-role client (see the webhook route). Typed as the real
 * SupabaseClient — the previous hand-rolled structural type drifted from
 * the SDK and broke typechecking on every SDK upgrade.
 */
type SupabaseLike = SupabaseClient;

async function linkDonorByEmail(
    supabase: SupabaseLike,
    donation: { id: string; organization_id: string | null; email: string | null; donor_name: string | null },
): Promise<void> {
    const email = donation.email?.trim().toLowerCase();
    if (!donation.organization_id || !email) return;
    const { data: existing } = await supabase
        .from('donors')
        .select('id')
        .eq('organization_id', donation.organization_id)
        .eq('email', email)
        .maybeSingle();
    let donorId: string | null = ((existing as { id?: string } | null)?.id as string | undefined) ?? null;
    if (!donorId) {
        const { data: created } = await supabase
            .from('donors')
            .insert({
                organization_id: donation.organization_id,
                name: donation.donor_name?.trim() || email,
                email,
                status: 'active',
            })
            .select('id')
            .single();
        donorId = ((created as { id?: string } | null)?.id as string | undefined) ?? null;
    }
    if (donorId) {
        await supabase.from('donations').update({ donor_id: donorId }).eq('id', donation.id).is('donor_id', null);
    }
}

export async function handleInvoiceEvent(
    supabase: SupabaseLike,
    event: Stripe.Event,
    nextStatus: 'completed' | 'failed',
): Promise<InvoiceOutcome> {
    const invoice = event.data.object as {
        id?: string;
        subscription?: string | null;
        customer?: string | null;
        customer_email?: string | null;
        amount_paid?: number;
        currency?: string;
    };
    const invoiceId = invoice.id ?? event.id;
    const subscriptionRef = typeof invoice.subscription === 'string' ? invoice.subscription : null;
    const amount = typeof invoice.amount_paid === 'number' ? invoice.amount_paid / 100 : 0;
    const currency = (invoice.currency ?? 'eur').toUpperCase();

    const { data: seen } = await supabase.from('donations').select('id').eq('stripe_invoice_id', invoiceId).maybeSingle();
    if (seen) return { kind: 'duplicate' };

    let organizationId: string | null = null;
    if (subscriptionRef) {
        const { data: prior } = await supabase
            .from('donations')
            .select('organization_id')
            .eq('subscription_ref', subscriptionRef)
            .maybeSingle();
        organizationId = ((prior as { organization_id?: string } | null)?.organization_id as string | undefined) ?? null;
    }
    if (!organizationId) {
        const { data: orgId } = await supabase.rpc('public_default_org_id');
        organizationId = (orgId as string | null) ?? null;
    }
    if (!organizationId || amount <= 0) return { kind: 'unmatched' };

    const { data: created, error } = await supabase
        .from('donations')
        .insert({
            organization_id: organizationId,
            amount,
            currency,
            type: 'recurring',
            status: nextStatus,
            payment_method: 'online',
            payment_provider: 'stripe',
            payment_ref: subscriptionRef,
            subscription_ref: subscriptionRef,
            stripe_invoice_id: invoiceId,
            stripe_customer_id: typeof invoice.customer === 'string' ? invoice.customer : null,
            email: invoice.customer_email ?? null,
            needs_receipt: false,
        })
        .select('id,organization_id,email,donor_name')
        .single();
    if (error || !created) return { kind: 'failed', message: 'insert failed' };
    const row = created as { id: string; organization_id: string | null; email: string | null; donor_name: string | null };
    await linkDonorByEmail(supabase, row);
    return { kind: 'created', donationId: row.id };
}

export function isInvoiceEvent(type: string): boolean {
    return type === 'invoice.paid' || type === 'invoice.payment_failed';
}

export type { NextResponse };
