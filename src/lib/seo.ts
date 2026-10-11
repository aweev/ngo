import type { Metadata } from 'next';
import { SUPPORTED_LOCALES } from '@/lib/i18n/locales';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ORG_NAME = 'AWE e.V.';
const ORG_URL = SITE_URL;
const ORG_LOGO = `${SITE_URL}/logo.png`;
const ORG_SAME_AS = [
    'https://twitter.com/awe_ev',
    'https://linkedin.com/org/awe-ev',
    'https://facebook.com/awe.ev',
    'https://instagram.com/awe_ev',
];

/**
 * Builds localized page metadata with canonical URL + hreflang alternates
 * for a public page. `path` is the locale-stripped route (e.g. '/public/about/team').
 */
export function buildPublicMetadata(options: {
    locale: string;
    path: string;
    title: string;
    description: string;
    ogImage?: string;
    twitterHandle?: string;
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    section?: string;
    tags?: string[];
}): Metadata {
    const { locale, path, title, description, ogImage, twitterHandle, publishedTime, modifiedTime, authors, section, tags } = options;
    const languages: Record<string, string> = {};
    for (const l of SUPPORTED_LOCALES) {
        languages[l] = `/${l}${path}`;
    }
    languages['x-default'] = `/en${path}`;

    const canonicalUrl = `${SITE_URL}/${locale}${path}`;
    const ogImageUrl = ogImage || `${SITE_URL}/og-default.png`;

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
            url: canonicalUrl,
            siteName: ORG_NAME,
            type: publishedTime ? 'article' : 'website',
            locale,
            images: [
                {
                    url: ogImageUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
            ...(publishedTime && { publishedTime }),
            ...(modifiedTime && { modifiedTime }),
            ...(authors && { authors }),
            ...(section && { section }),
            ...(tags && { tags }),
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [ogImageUrl],
            ...(twitterHandle && { creator: twitterHandle, site: twitterHandle }),
        },
        other: {
            'script:ld+json': JSON.stringify(buildStructuredData({ locale, path, title, description, ogImage: ogImageUrl, publishedTime, modifiedTime, authors, section, tags })),
        },
    };
}

interface StructuredDataOptions {
    locale: string;
    path: string;
    title: string;
    description: string;
    ogImage: string;
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    section?: string;
    tags?: string[];
}

function buildStructuredData(options: StructuredDataOptions) {
    const { locale, path, title, description, ogImage, publishedTime, modifiedTime, authors, section, tags } = options;
    const canonicalUrl = `${SITE_URL}/${locale}${path}`;

    const isArticle = !!publishedTime;
    const isHome = path === '/public';
    const isAbout = path.startsWith('/public/about');
    const isEvent = path.startsWith('/public/events/');
    const isNews = path.startsWith('/public/news/');
    const isStory = path.startsWith('/public/stories/');
    const isDonate = path.startsWith('/public/get-involved/donate');
    const isProgram = path.startsWith('/public/programs/');

    // Organization schema (always included)
    const organization = {
        '@context': 'https://schema.org',
        '@type': 'NGO',
        name: ORG_NAME,
        url: ORG_URL,
        logo: ORG_LOGO,
        sameAs: ORG_SAME_AS,
        description: 'Empowering communities through education, sustainable development, and unwavering support.',
        address: {
            '@type': 'PostalAddress',
            streetAddress: 'Musterstraße 123',
            addressLocality: 'Berlin',
            addressCountry: 'DE',
        },
        contactPoint: {
            '@type': 'ContactPoint',
            telephone: '+49-30-12345678',
            contactType: 'customer service',
            availableLanguage: ['German', 'English', 'French', 'Spanish', 'Arabic'],
        },
        nonprofitStatus: 'Registered Non-Profit',
        taxID: 'DE123456789',
    };

    // WebSite schema (homepage only)
    const website = isHome ? {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: ORG_NAME,
        url: ORG_URL,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${SITE_URL}/{locale}/public/search?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
        },
    } : null;

    // WebPage schema
    const webPage = {
        '@context': 'https://schema.org',
        '@type': isArticle ? 'Article' : 'WebPage',
        name: title,
        description,
        url: canonicalUrl,
        inLanguage: locale,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        publisher: {
            '@type': 'Organization',
            name: ORG_NAME,
            logo: { '@type': 'ImageObject', url: ORG_LOGO },
        },
        ...(ogImage && { image: ogImage }),
        ...(publishedTime && { datePublished: publishedTime }),
        ...(modifiedTime && { dateModified: modifiedTime }),
        ...(authors && { author: authors.map((name) => ({ '@type': 'Person', name })) }),
        ...(section && { articleSection: section }),
        ...(tags && { keywords: tags.join(', ') }),
    };

    // Event schema for event pages
    const eventSchema = isEvent ? buildEventSchema() : null;

    // Donation schema for donate pages
    const donateSchema = isDonate ? buildDonationSchema() : null;

    // Breadcrumb schema
    const breadcrumb = buildBreadcrumbSchema(locale, path);

    const graphs: Record<string, unknown>[] = [organization];
    if (website) graphs.push(website);
    graphs.push(webPage);
    if (eventSchema) graphs.push(eventSchema);
    if (donateSchema) graphs.push(donateSchema);
    if (breadcrumb) graphs.push(breadcrumb);

    return {
        '@context': 'https://schema.org',
        '@graph': graphs,
    };
}

function buildEventSchema() {
    // Event data would need to be passed in from the page
    // This is a template - actual data should be passed from the page component
    return {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: 'Event Title',
        description: 'Event Description',
        startDate: '2026-01-01T18:00:00+01:00',
        endDate: '2026-01-01T20:00:00+01:00',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
            '@type': 'Place',
            name: 'Event Location',
            address: {
                '@type': 'PostalAddress',
                streetAddress: '',
                addressLocality: 'Berlin',
                addressCountry: 'DE',
            },
        },
        organizer: {
            '@type': 'Organization',
            name: ORG_NAME,
            url: ORG_URL,
        },
        offers: {
            '@type': 'Offer',
            url: `${SITE_URL}/register`,
            price: '0',
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
            validFrom: '2026-01-01T00:00:00+01:00',
        },
    };
}

export function buildDonationSchema() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Donate to AWE e.V.',
        description: 'Your contribution creates sustainable change.',
        url: `${SITE_URL}/public/get-involved/donate`,
        mainEntity: {
            '@type': 'Product',
            name: 'Donation',
            description: 'Support our mission with a one-time or recurring donation.',
            brand: { '@type': 'Brand', name: ORG_NAME },
            offers: {
                '@type': 'Offer',
                url: `${SITE_URL}/public/get-involved/donate`,
                priceCurrency: 'EUR',
                price: '25',
                availability: 'https://schema.org/InStock',
                seller: { '@type': 'Organization', name: ORG_NAME },
            },
        },
    };
}

function buildBreadcrumbSchema(locale: string, path: string) {
    const segments = path.split('/').filter(Boolean);
    const items = [
        {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE_URL}/${locale}/public`,
        },
    ];

    let currentPath = '';
    segments.forEach((segment, index) => {
        currentPath += `/${segment}`;
        const name = segment
            .split('-')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
        items.push({
            '@type': 'ListItem',
            position: index + 2,
            name,
            item: `${SITE_URL}/${locale}${currentPath}`,
        });
    });

    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items,
    };
}

export function buildArticleSchema(options: {
    title: string;
    description: string;
    url: string;
    image: string;
    publishedTime: string;
    modifiedTime?: string;
    authors: string[];
    section?: string;
    tags?: string[];
    locale: string;
}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: options.title,
        description: options.description,
        url: options.url,
        image: options.image,
        datePublished: options.publishedTime,
        dateModified: options.modifiedTime || options.publishedTime,
        author: options.authors.map((name) => ({ '@type': 'Person', name })),
        publisher: {
            '@type': 'Organization',
            name: ORG_NAME,
            logo: { '@type': 'ImageObject', url: ORG_LOGO },
        },
        mainEntityOfPage: { '@type': 'WebPage', '@id': options.url },
        inLanguage: options.locale,
        articleSection: options.section,
        keywords: options.tags?.join(', '),
    };
}

export function buildEventSchemaFromData(options: {
    title: string;
    description: string;
    url: string;
    image: string;
    startDate: string;
    endDate?: string;
    location: string;
    city: string;
    country: string;
    virtualLink?: string;
    maxAttendees?: number;
    price?: number;
    currency?: string;
    locale: string;
}) {
    const isVirtual = !!options.virtualLink;
    return {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: options.title,
        description: options.description,
        url: options.url,
        image: options.image,
        startDate: options.startDate,
        endDate: options.endDate,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: isVirtual
            ? 'https://schema.org/OnlineEventAttendanceMode'
            : 'https://schema.org/OfflineEventAttendanceMode',
        location: isVirtual
            ? {
                '@type': 'VirtualLocation',
                url: options.virtualLink!,
                name: 'Online Event',
            }
            : {
                '@type': 'Place',
                name: options.location,
                address: {
                    '@type': 'PostalAddress',
                    streetAddress: options.location,
                    addressLocality: options.city,
                    addressCountry: options.country,
                },
            },
        organizer: {
            '@type': 'Organization',
            name: ORG_NAME,
            url: ORG_URL,
        },
        offers: {
            '@type': 'Offer',
            url: options.url,
            price: options.price?.toString() || '0',
            priceCurrency: options.currency || 'EUR',
            availability: 'https://schema.org/InStock',
            validFrom: new Date().toISOString(),
        },
        inLanguage: options.locale,
    };
}