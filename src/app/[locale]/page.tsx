import { redirect } from 'next/navigation';
import { routing } from '@/lib/navigation';

type Props = {
    params: Promise<{ locale: string }>;
};

export default async function LocaleRootPage({ params }: Props) {
    const { locale } = await params;

    // Validate locale before redirecting
    if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
        return null;
    }

    // Redirect to the public landing page
    redirect(`/${locale}/public`);
}
