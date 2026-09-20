import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { sendDonationReceipt, sendTaxReceipt } from '@/actions/email';
import { receiptUrlFor } from '@/lib/receipts';
import { handleInvoiceEvent, isInvoiceEvent } from '@/lib/stripe-invoices';

/**
 * Stripe webhook — the only place a donation row is marked `completed`.
 *
 * `createDonationCheckout` (src/actions/public.ts) inserts the donation as
 * `pending` and stores the Checkout Session id in `payment_ref`. The browser
 * is never trusted to confirm payment: this handler verifies the Stripe
 * signature with STRIPE_WEBHOOK_SECRET and flips the row using the service
 * role client (RLS is bypassed deliberately — there is no user session).
 *
 * Route lives outside the `[locale]` segment and is excluded from the i18n
 * matcher in src/proxy.ts, so the URL is stable: POST /api/stripe/webhook.
 *
 * Configure in the Stripe dashboard (or `stripe listen --forward-to
 * localhost:3000/api/stripe/webhook` locally) for:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.expired, charge.refunded, payment_intent.payment_failed,
 *   invoice.paid, invoice.payment_failed
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUS_BY_EVENT: Record<string, 'completed' | 'failed' | 'refunded'> = {
    'checkout.session.completed': 'completed',
    'checkout.session.async_payment_succeeded': 'completed',
    'checkout.session.expired': 'failed',
    'charge.refunded': 'refunded',
    'payment_intent.payment_failed': 'failed',
    'invoice.paid': 'completed',
    'invoice.payment_failed': 'failed',
};

function resolveSessionId(event: Stripe.Event): string | null {
    const object = event.data.object as { id?: string };
    if (event.type === 'charge.refunded') return null;
    return object.id ?? null;
}

async function generateReceiptUrl(donationId: string, email: string | null): Promise<{ receiptUrl: string | undefined; taxReceiptUrl: string | undefined }> {
    return {
        receiptUrl: receiptUrlFor(donationId, email, 'receipt') ?? undefined,
        taxReceiptUrl: receiptUrlFor(donationId, email, 'tax') ?? undefined,
    };
}

/** Upsert the donor row for a completed payment. Never throws. */
async function linkDonor(
    supabase: ReturnType<typeof createSupabaseAdminClient>,
    donation: { id: string; organization_id: string | null; email: string | null; donor_name: string | null },
): Promise<void> {
    try {
        const email = donation.email?.trim().toLowerCase();
        if (!donation.organization_id || !email) return;
        const { data: existing } = await supabase
            .from('donors')
            .select('id')
            .eq('organization_id', donation.organization_id)
            .ilike('email', email)
            .maybeSingle();
        let donorId: string | null = (existing?.id as string | null) ?? null;
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
            donorId = (created?.id as string | null) ?? null;
        }
        if (donorId) {
            await supabase
                .from('donations')
                .update({ donor_id: donorId })
                .eq('id', donation.id)
                .is('donor_id', null);
        }
    } catch (err) {
        console.error('[stripe/webhook] Donor link failed:', err instanceof Error ? err.message : err);
    }
}

export async function POST(request: Request) {
    return handleStripeEvent(request);
}

export async function handleStripeEvent(request: Request) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secretKey || !webhookSecret) {
        console.error('[stripe/webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET.');
        return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 });
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
    }

    const rawBody = await request.text();

    let event: Stripe.Event;
    try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(secretKey);
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
        console.error('[stripe/webhook] Signature verification failed:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
    }

    const nextStatus = STATUS_BY_EVENT[event.type];
    if (!nextStatus) {
        return NextResponse.json({ received: true, ignored: event.type });
    }

    const supabase = createSupabaseAdminClient();

    const { error: dedupError } = await supabase
        .from('stripe_events')
        .insert({ event_id: event.id, event_type: event.type });
    if (dedupError) {
        if ((dedupError as { code?: string }).code === '23505') {
            return NextResponse.json({ received: true, duplicate: true });
        }
        console.error('[stripe/webhook] Failed to record stripe event:', dedupError);
        return NextResponse.json({ error: 'Dedup failed.' }, { status: 500 });
    }

    let paymentIntentId: string | null = null;
    let subscriptionId: string | null = null;

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        try {
            const session = event.data.object as { payment_intent?: string | { id: string } | null; subscription?: string | { id: string } | null };
            const pi = session.payment_intent;
            paymentIntentId = typeof pi === 'string' ? pi : (pi?.id ?? null);
            const sub = session.subscription;
            subscriptionId = typeof sub === 'string' ? sub : (sub?.id ?? null);

            if (!paymentIntentId) {
                const { default: Stripe } = await import('stripe');
                const stripe = new Stripe(secretKey);
                const sessionId = resolveSessionId(event);
                if (sessionId) {
                    const full = await stripe.checkout.sessions.retrieve(sessionId);
                    const fullPi = full.payment_intent;
                    paymentIntentId = typeof fullPi === 'string' ? fullPi : (fullPi?.id ?? null);
                    if (!subscriptionId) {
                        const fullSub = full.subscription;
                        subscriptionId = typeof fullSub === 'string' ? fullSub : (fullSub?.id ?? null);
                    }
                }
            }
        } catch (err) {
            console.error('[stripe/webhook] Failed to resolve payment_intent:', err instanceof Error ? err.message : err);
        }
    }

    type DonationRow = { id: string; status: string | null; amount: number; currency: string; type: string; organization_id: string | null; email: string | null; donor_name: string | null };
    let matched: DonationRow[] | null = null;

    // Recurring invoices land as one donation row per invoice (P0-4).
    if (isInvoiceEvent(event.type)) {
        const outcome = await handleInvoiceEvent(supabase, event, nextStatus);
        if (outcome.kind === 'created') return NextResponse.json({ received: true, updated: 1 });
        if (outcome.kind === 'duplicate') return NextResponse.json({ received: true, duplicate: true });
        if (outcome.kind === 'unmatched') return NextResponse.json({ received: true, unmatched: event.type });
        return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
    }

    if (event.type === 'charge.refunded') {
        const charge = event.data.object as { payment_intent?: string | null };
        if (!charge.payment_intent) {
            return NextResponse.json({ received: true, unmatched: event.type });
        }
        const { data, error } = await supabase
            .from('donations')
            .update({ status: nextStatus })
            .eq('payment_intent', charge.payment_intent)
            .neq('status', nextStatus)
            .select('id,status,amount,currency,type,organization_id,email,donor_name')
            .single();
        if (error) {
            console.error('[stripe/webhook] Failed to update donation:', error);
            return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
        }
        matched = [(data ?? {}) as DonationRow];
    } else {
        const sessionId = resolveSessionId(event);
        if (!sessionId) {
            return NextResponse.json({ received: true, unmatched: event.type });
        }
        const patch: { status: string; payment_intent?: string; subscription_ref?: string; receipt_url?: string; tax_receipt_url?: string } = {
            status: nextStatus,
            payment_intent: paymentIntentId ?? undefined,
        };

        if (subscriptionId) {
            patch.subscription_ref = subscriptionId;
        }

        if (nextStatus === 'completed') {
            const { data: donationData } = await supabase
                .from('donations')
                .select('id,amount,currency,type,organization_id,email,donor_name')
                .eq('payment_ref', sessionId)
                .maybeSingle();
            if (donationData) {
                const row = donationData as DonationRow;
                const { receiptUrl, taxReceiptUrl } = await generateReceiptUrl(row.id, row.email);
                patch.receipt_url = receiptUrl;
                patch.tax_receipt_url = taxReceiptUrl;
            }
        }

        const { data, error } = await supabase
            .from('donations')
            .update(patch)
            .eq('payment_ref', sessionId)
            .neq('status', nextStatus)
            .select('id,status,amount,currency,type,organization_id,email,donor_name')
            .single();
        if (error) {
            console.error('[stripe/webhook] Failed to update donation:', error);
            return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
        }
        matched = [(data ?? {}) as DonationRow];
    }

    if (!matched || matched.length === 0) {
        console.error(
            `[stripe/webhook] No donation transitioned for event ${event.type} (${event.id}).`,
        );
        return NextResponse.json({ received: true, unmatched: true });
    }

    // Send email receipts on successful payment
    const donation = matched[0] as DonationRow;
    if (nextStatus === 'completed') {
        await linkDonor(supabase, donation);
        try {
            const { data: donorData } = await supabase
                .from('donations')
                .select('email,donor_name')
                .eq('id', donation.id)
                .maybeSingle();

            if (donorData?.email) {
                const { receiptUrl, taxReceiptUrl } = await generateReceiptUrl(donation.id, donorData.email as string);
                await sendDonationReceipt({
                    to: donorData.email,
                    donorName: donorData.donor_name ?? 'Thank you',
                    amount: donation.amount,
                    currency: donation.currency,
                    donationId: donation.id,
                    receiptUrl,
                });

                if (donation.type === 'one_time' && donorData.donor_name) {
                    await sendTaxReceipt({
                        to: donorData.email,
                        donorName: donorData.donor_name,
                        amount: donation.amount,
                        currency: donation.currency,
                        donationId: donation.id,
                        taxReceiptUrl,
                    });
                }
            }
        } catch (err) {
            console.error('[stripe/webhook] Failed to send receipts:', err instanceof Error ? err.message : err);
        }
    }

    return NextResponse.json({ received: true, updated: matched.length });
}
