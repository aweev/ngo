import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

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
 *   checkout.session.expired, charge.refunded
 */

// Node runtime: signature verification needs the raw body + node crypto.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Donation status transitions we recognise from provider events. */
const STATUS_BY_EVENT: Record<string, 'completed' | 'failed' | 'refunded'> = {
    'checkout.session.completed': 'completed',
    'checkout.session.async_payment_succeeded': 'completed',
    'checkout.session.expired': 'failed',
    'charge.refunded': 'refunded',
};

function resolveSessionId(event: Stripe.Event): string | null {
    const object = event.data.object as { id?: string };
    // For charge.refunded the object is a Charge; its id is not a session id,
    // so the donation is looked up by payment_intent instead (see below).
    if (event.type === 'charge.refunded') return null;
    return object.id ?? null;
}

export async function POST(request: Request) {
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
        // Never log the raw body here — it may contain donor details.
        console.error('[stripe/webhook] Signature verification failed:', err instanceof Error ? err.message : err);
        return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
    }

    const nextStatus = STATUS_BY_EVENT[event.type];
    if (!nextStatus) {
        // Acknowledge everything else so Stripe does not retry unrelated events.
        return NextResponse.json({ received: true, ignored: event.type });
    }

    const supabase = createSupabaseAdminClient();

    // Idempotency: Stripe retries deliveries until 2xx. Record the provider
    // event id first; a unique violation means we already handled it.
    const { error: dedupError } = await supabase
        .from('stripe_events')
        .insert({ event_id: event.id, event_type: event.type });
    if (dedupError) {
        // 23505 = unique violation → duplicate delivery. Ack without side effects.
        if ((dedupError as { code?: string }).code === '23505') {
            return NextResponse.json({ received: true, duplicate: true });
        }
        console.error('[stripe/webhook] Failed to record stripe event:', dedupError);
        return NextResponse.json({ error: 'Dedup failed.' }, { status: 500 });
    }

    // Link Checkout Session → PaymentIntent so later `charge.refunded`
    // events (which only carry the PaymentIntent) can find the donation.
    let paymentIntentId: string | null = null;
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        try {
            const session = event.data.object as { payment_intent?: string | { id: string } | null };
            const pi = session.payment_intent;
            paymentIntentId = typeof pi === 'string' ? pi : (pi?.id ?? null);
            if (!paymentIntentId) {
                const { default: Stripe } = await import('stripe');
                const stripe = new Stripe(secretKey);
                const sessionId = resolveSessionId(event);
                if (sessionId) {
                    const full = await stripe.checkout.sessions.retrieve(sessionId);
                    const fullPi = full.payment_intent;
                    paymentIntentId = typeof fullPi === 'string' ? fullPi : (fullPi?.id ?? null);
                }
            }
        } catch (err) {
            console.error('[stripe/webhook] Failed to resolve payment_intent:', err instanceof Error ? err.message : err);
        }
    }

    type DonationRow = { id: string; status: string | null };
    let matched: DonationRow[] | null = null;

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
            .select('id,status');
        if (error) {
            console.error('[stripe/webhook] Failed to update donation:', error);
            // 500 so Stripe retries the delivery.
            return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
        }
        matched = (data ?? []) as DonationRow[];
    } else {
        const sessionId = resolveSessionId(event);
        if (!sessionId) {
            return NextResponse.json({ received: true, unmatched: event.type });
        }
        const patch: { status: string; payment_intent?: string } = { status: nextStatus };
        if (paymentIntentId) patch.payment_intent = paymentIntentId;
        const { data, error } = await supabase
            .from('donations')
            .update(patch)
            .eq('payment_ref', sessionId)
            .neq('status', nextStatus)
            .select('id,status');
        if (error) {
            console.error('[stripe/webhook] Failed to update donation:', error);
            // 500 so Stripe retries the delivery.
            return NextResponse.json({ error: 'Update failed.' }, { status: 500 });
        }
        matched = (data ?? []) as DonationRow[];
    }

    if (!matched || matched.length === 0) {
        // Either no donation matched the provider reference (e.g. the
        // insert failed) or the row already carries the target status
        // (duplicate / out-of-order delivery guarded by neq + stripe_events).
        // Acknowledge — retrying will not fix it — but log loudly so the
        // donation can be reconciled manually.
        console.error(
            `[stripe/webhook] No donation transitioned for event ${event.type} (${event.id}).`,
        );
        return NextResponse.json({ received: true, unmatched: true });
    }

    return NextResponse.json({ received: true, updated: matched.length });
}