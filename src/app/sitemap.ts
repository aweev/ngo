import { MetadataRoute } from 'next';
import { routing } from '@/lib/navigation';
import { ENV } from '@/lib/env';
import {
    getPublicEventSlugs,
    getPublicImpactStorySlugs,
    getPublicNewsSlugs,
    getPublicProjectSlugs,
    getPublicTeamMemberSlugs,
    getPublicDocumentSlugs,
    getPublicMilestoneSlugs,
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
    '/public/programs/education',
    '/public/programs/health',
    '/public/programs/economic-empowerment',
    '/public/programs/social-integration',
    '/public/events',
    '/public/stories',
    '/public/news',
    '/public/get-involved',
    '/public/get-involved/donate',
    '/public/get-involved/volunteer',
    '/public/get-involved/corporate',
    '/public/contact',
    '/public/contact/report',
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

    // Dynamic CMS entries (published projects, events, news, impact stories, team, documents, milestones).
    // NOTE (P0/Phase 4): campaigns are merged into projects.kind — no standalone
    // /public/campaigns hub exists, so campaign slugs are intentionally NOT
    // emitted (orphan URLs would 404 and pollute the index).
    const [
        projects,
        events,
        news,
        stories,
        teamMembers,
        documents,
        milestones,
    ] = await Promise.all([
        getPublicProjectSlugs(),
        getPublicEventSlugs(),
        getPublicNewsSlugs(),
        getPublicImpactStorySlugs(),
        getPublicTeamMemberSlugs(),
        getPublicDocumentSlugs(),
        getPublicMilestoneSlugs(),
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
        for (const t of teamMembers.data ?? []) {
            sitemapEntries.push({
                url: `${baseUrl}/${locale}/public/about/team/${encodeURIComponent(t.slug)}`,
                lastModified: t.updated_at ? new Date(t.updated_at) : undefined,
                changeFrequency: 'monthly',
                priority: 0.5,
            });
        }
        for (const d of documents.data ?? []) {
            sitemapEntries.push({
                url: `${baseUrl}/${locale}/public/about/financials/${encodeURIComponent(d.slug)}`,
                lastModified: d.updated_at ? new Date(d.updated_at) : undefined,
                changeFrequency: 'monthly',
                priority: 0.5,
            });
        }
        for (const m of milestones.data ?? []) {
            // Milestones render inside /public/about (timeline), not as standalone
            // /public/about/<slug> routes — link to the anchored section.
            sitemapEntries.push({
                url: `${baseUrl}/${locale}/public/about#milestone-${encodeURIComponent(m.slug)}`,
                lastModified: m.updated_at ? new Date(m.updated_at) : undefined,
                changeFrequency: 'monthly',
                priority: 0.4,
            });
        }
    }

    return sitemapEntries;
}