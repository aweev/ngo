import type { Metadata } from 'next';
import { SUPPORTED_LOCALES } from '@/lib/i18n/locales';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Builds localized page metadata with canonical URL + hreflang alternates
 * for a public page. `path` is the locale-stripped route (e.g. '/public/about/team').
 */
export function buildPublicMetadata(options: {
    locale: string;
    path: string;
    title: string;
    description: string;
}): Metadata {
    const { locale, path, title, description } = options;
    const languages: Record<string, string> = {};
    for (const l of SUPPORTED_LOCALES) {
        languages[l] = `/${l}${path}`;
    }
    languages['x-default'] = `/en${path}`;

    return {
        title,
        description,
        alternates: {
            canonical: `/${locale}${path}`,
            languages,
        },
        openGraph: {
            title,
            description,
            url: `${SITE_URL}/${locale}${path}`,
            siteName: 'AWE',
            type: 'website',
            locale,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    };
}
