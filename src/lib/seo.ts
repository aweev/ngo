import type { Metadata } from 'next';
import { SUPPORTED_LOCALES } from '@/lib/i18n/locales';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
// P0: org identity is deployment config, never hardcoded marketing copy.
// Set ORG_* env vars per deployment; fallbacks are the legacy AWE defaults.
const ORG_NAME = process.env.NEXT_PUBLIC_ORG_NAME || 'AWE e.V.';
const ORG_URL = process.env.NEXT_PUBLIC_ORG_URL || SITE_URL;
const ORG_LOGO = process.env.NEXT_PUBLIC_ORG_LOGO || `${SITE_URL}/logo.png`;
const ORG_SAME_AS = (process.env.NEXT_PUBLIC_ORG_SAME_AS || 'https://twitter.com/awe_ev,https://linkedin.com/org/awe-ev,https://facebook.com/awe.ev,https://instagram.com/awe_ev')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const ORG_STREET = process.env.NEXT_PUBLIC_ORG_STREET || '';
const ORG_CITY = process.env.NEXT_PUBLIC_ORG_CITY || 'Berlin';
const ORG_COUNTRY = process.env.NEXT_PUBLIC_ORG_COUNTRY || 'DE';
const ORG_PHONE = process.env.NEXT_PUBLIC_ORG_PHONE || '';
const ORG_TAX_ID = process.env.NEXT_PUBLIC_ORG_TAX_ID || '';
const ORG_DESCRIPTION = process.env.NEXT_PUBLIC_ORG_DESCRIPTION || 'Empowering communities through education, sustainable development, and unwavering support.';

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
    };
}

/**
 * P0: JSON-LD must render as <script type="application/ld+json">, not via
 * metadata `other` (which emits <meta> and never executes). Call this from
 * a server component and inline the return value:
 *   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdForPage(...)) }} />
 */
export function jsonLdForPage(options: {
    locale: string;
    path: string;
    title: string;
    description: string;
    ogImage?: string;
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    section?: string;
    tags?: string[];
}) {
    const ogImageUrl = options.ogImage || `${SITE_URL}/og-default.png`;
    return buildStructuredData({ ...options, ogImage: ogImageUrl });
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
    const isEvent = path.startsWith('/public/events/');
    const isDonate = path.startsWith('/public/get-involved/donate');

    // Organization schema (always included)
    const organization = {
        '@context': 'https://schema.org',
        '@type': 'NGO',
        name: ORG_NAME,
        url: ORG_URL,
        logo: ORG_LOGO,
        sameAs: ORG_SAME_AS,
        description: ORG_DESCRIPTION,
        address: {
            '@type': 'PostalAddress',
            ...(ORG_STREET ? { streetAddress: ORG_STREET } : {}),
            addressLocality: ORG_CITY,
            addressCountry: ORG_COUNTRY,
        },
        ...(ORG_PHONE
            ? {
                contactPoint: {
                    '@type': 'ContactPoint',
                    telephone: ORG_PHONE,
                    contactType: 'customer service',
                    availableLanguage: ['German', 'English', 'French', 'Spanish', 'Arabic'],
                },
            }
            : {}),
        nonprofitStatus: 'Registered Non-Profit',
        ...(ORG_TAX_ID ? { taxID: ORG_TAX_ID } : {}),
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
    // P0: no placeholder structured data. Event JSON-LD is emitted only via
    // buildEventSchemaFromData() with real CMS data. Returning null keeps the
    // graph clean instead of indexing "Event Title / 2026-01-01" fixtures.
    return null;
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