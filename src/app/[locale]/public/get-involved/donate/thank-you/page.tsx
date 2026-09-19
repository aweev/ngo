import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { CheckCircle2, Clock, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DonationImpactRail } from '@/components/donation/thank-you-impact';

/**
 * Post-checkout destination for Stripe Checkout
 * (`success_url` in createDonationCheckout).
 *
 * The page never claims a payment succeeded on its own: with a
 * `session_id` it asks Stripe for the session status server-side, and
 * without one it says the donation is being processed (the webhook may
 * still be in flight).
 */

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Donation.ThankYou' });
    return {
        title: t('title'),
        description: t('description'),
        robots: { index: false, follow: false },
    };
}

type SessionDetails = {
    paid: boolean;
    amount: number | null;
    currency: string | null;
    email: string | null;
    recurring: boolean;
};

/** Server-side confirmation — the browser query string is never trusted. */
async function getSessionDetails(sessionId: string | undefined): Promise<SessionDetails | null> {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret || !sessionId || !sessionId.startsWith('cs_')) return null;

    try {
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(secret);
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        return {
            paid: session.payment_status === 'paid' || session.status === 'complete',
            amount: session.amount_total !== null ? session.amount_total / 100 : null,
            currency: session.currency?.toUpperCase() ?? null,
            email: session.customer_details?.email ?? session.customer_email ?? null,
            recurring: session.mode === 'subscription',
        };
    } catch (err) {
        console.error('[donate/thank-you] Could not retrieve checkout session:', err);
        return null;
    }
}

export default async function DonationThankYouPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<Record<string, string | undefined>>;
}) {
    const { locale } = await params;
    const query = await searchParams;
    const t = await getTranslations({ locale, namespace: 'Donation.ThankYou' });

    const details = await getSessionDetails(query.session_id);
    const confirmed = details?.paid === true;

    const amountLabel =
        details?.amount !== null && details?.amount !== undefined
            ? new Intl.NumberFormat(locale, {
                  style: 'currency',
                  currency: details.currency || 'EUR',
                  maximumFractionDigits: details.amount % 1 === 0 ? 0 : 2,
              }).format(details.amount)
            : null;

    return (
        <main className="bg-background min-h-screen pt-32 pb-24">
            <div className="container mx-auto px-4 max-w-3xl">
                <div className="text-center space-y-6">
                    <div
                        className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                            confirmed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}
                    >
                        {confirmed ? <CheckCircle2 className="h-10 w-10" /> : <Clock className="h-10 w-10" />}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
                        {confirmed ? t('confirmed_title') : t('processing_title')}
                    </h1>

                    <p className="text-lg text-muted-foreground leading-relaxed">
                        {confirmed
                            ? details?.recurring
                                ? t('confirmed_recurring_body', { amount: amountLabel ?? '' })
                                : t('confirmed_body', { amount: amountLabel ?? '' })
                            : t('processing_body')}
                    </p>

                    {details?.email && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm font-medium text-foreground">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {t('receipt_notice', { email: details.email })}
                        </div>
                    )}
                </div>

                <DonationImpactRail />

                <div className="mt-16 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                        <ShieldCheck className="h-4 w-4" />
                        {t('secure_footer')}
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <Button asChild variant="outline" className="rounded-full">
                            <Link href="/public">{t('back_home')}</Link>
                        </Button>
                        <Button asChild className="rounded-full">
                            <Link href="/public/about/financials">{t('see_impact')}</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}