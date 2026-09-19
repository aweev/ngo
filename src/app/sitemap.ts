import { MetadataRoute } from 'next';
import { routing } from '@/lib/navigation';
import { ENV } from '@/lib/env';
import {
    getPublicEventSlugs,
    getPublicImpactStorySlugs,
    getPublicNewsSlugs,
    getPublicProjectSlugs,
} from '@/actions/public';
import { projectPath } from '@/lib/program-routes';
import type { ProgramCategory } from '@/lib/program-themes';

// Define your static public routes here (public/* lives under /[locale]/public/*)
const publicRoutes = [
    '/public',             // Home
    '/public/about',
    '/public/about/team',
    '/public/about/financials',
    '/public/about/partners',
    '/public/programs',
    '/public/events',
    '/public/stories',
    '/public/get-involved',
    '/public/contact',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const sitemapEntries: MetadataRoute.Sitemap = [];

    // Static hubs: one entry per route per locale.
    for (const route of publicRoutes) {
        for (const locale of routing.locales) {
            sitemapEntries.push({
                url: `${baseUrl}/${locale}${route}`,
                changeFrequency: 'weekly',
                priority: route === '/public' ? 1.0 : 0.8, // Home page is higher priority
            });
        }
    }

    // Dynamic CMS entries (published projects, events, news, impact stories).
    // All slug helpers read safe public views through the cookieless anon
    // client and fail soft to [] when the DB is unreachable, so sitemap
    // generation never breaks the build.
    const [projects, events, news, stories] = await Promise.all([
        getPublicProjectSlugs(),
        getPublicEventSlugs(),
        getPublicNewsSlugs(),
        getPublicImpactStorySlugs(),
    ]);

    for (const locale of routing.locales) {
        for (const p of projects.data ?? []) {
            if (!p.category) continue; // project URLs are category-scoped
            sitemapEntries.push({
                url: `${baseUrl}/${locale}${projectPath(p.category as ProgramCategory, p.slug)}`,
                lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
                changeFrequency: 'monthly',
                priority: 0.6,
            });
        }
        for (const e of events.data ?? []) {
            sitemapEntries.push({
                url: `${baseUrl}/${locale}/public/events/${encodeURIComponent(e.slug)}`,
                lastModified: e.updated_at ? new Date(e.updated_at) : undefined,
                changeFrequency: 'weekly',
                priority: 0.6,
            });
        }
        for (const n of news.data ?? []) {
            sitemapEntries.push({
                url: `${baseUrl}/${locale}/public/news/${encodeURIComponent(n.slug)}`,
                lastModified: n.updated_at ? new Date(n.updated_at) : undefined,
                changeFrequency: 'weekly',
                priority: 0.6,
            });
        }
        for (const s of stories.data ?? []) {
            sitemapEntries.push({
                url: `${baseUrl}/${locale}/public/stories/${encodeURIComponent(s.slug)}`,
                lastModified: s.updated_at ? new Date(s.updated_at) : undefined,
                changeFrequency: 'weekly',
                priority: 0.6,
            });
        }
    }

    return sitemapEntries;
}