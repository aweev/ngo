import { confirmNewsletterSubscription } from '@/actions/public';
import { buildPublicMetadata } from '@/lib/seo';
import { Link } from '@/lib/navigation';

// Token confirmation is per-request — never prerender.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    return buildPublicMetadata({
        locale,
        path: '/public/subscribe/confirm',
        title: 'Confirm newsletter subscription',
        description: 'Confirm your newsletter subscription.',
    });
}

export default async function SubscribeConfirmPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ token?: string }>;
}) {
    const { locale } = await params;
    const { token } = await searchParams;
    let ok = false;
    let error: string | null = null;
    if (token) {
        const res = await confirmNewsletterSubscription(token);
        ok = res.success;
        error = res.error;
    } else {
        error = 'Missing confirmation token.';
    }
    return (
        <main className="container mx-auto max-w-xl px-4 py-16 text-center">
            <h1 className="mb-4 font-serif text-3xl font-bold">
                {ok ? 'Subscription confirmed' : 'Confirmation failed'}
            </h1>
            <p className="mb-8 text-muted-foreground">
                {ok
                    ? 'Thank you — your newsletter subscription is now active.'
                    : (error ?? 'This link is invalid or has expired. Please subscribe again.')}
            </p>
            <Link href={`/${locale}/public`} className="underline">
                Back to home
            </Link>
        </main>
    );
}
