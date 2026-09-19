import { revalidatePath, revalidateTag } from 'next/cache';
import { PUBLIC_CONTENT_TAG, PUBLIC_VOLUNTEER_TAG } from '@/lib/cache-tags';

export { PUBLIC_CONTENT_TAG, PUBLIC_REVALIDATE_SECONDS, PUBLIC_VOLUNTEER_TAG } from '@/lib/cache-tags';

/**
 * Cache configuration for the public website.
 *
 * Public reads go through the cookieless anon client
 * (`createSupabasePublicClient`), which stores each response in Next.js'
 * Data Cache under `PUBLIC_CONTENT_TAG` for
 * `PUBLIC_REVALIDATE_SECONDS`. This keeps DB load flat even on pages that
 * must render dynamically (anything reading `searchParams`).
 *
 * Two invalidation layers, both applied by admin write actions:
 *   1. `revalidatePublicData()` — drops the cached DB rows by tag.
 *   2. `revalidatePublicRoute()` — drops the full-route ISR payloads
 *      (homepage, hubs, detail pages) for every locale.
 *
 * `revalidatePath('/[locale]/…', 'page')` targets the dynamic-segment
 * pattern, so a single call covers all five locale variants — unlike the
 * unprefixed paths used previously, which never matched a real URL.
 */

/** Purge every cached public DB read (call on any public-content write). */
export function revalidatePublicData(): void {
    // Next.js 16 requires an explicit cache-life profile (see revalidateTag
    // typings); 'max' expires the entry as aggressively as the platform allows.
    revalidateTag(PUBLIC_CONTENT_TAG, 'max');
    revalidateTag(PUBLIC_VOLUNTEER_TAG, 'max');
}

/** Revalidate a public route in every locale, using its dynamic-route pattern. */
export function revalidatePublicRoute(path: string, type: 'page' | 'layout' = 'page'): void {
    revalidatePath(`/[locale]${path}`, type);
}

/**
 * Revalidate every route that renders `content_pages` data (homepage,
 * about pages, news + stories hubs and detail pages). Call this whenever
 * a content page is created, updated, published, or unpublished.
 */
export function revalidatePublicContentRoutes(): void {
    revalidatePublicRoute('/public');
    revalidatePublicRoute('/public/about');
    revalidatePublicRoute('/public/about/team');
    revalidatePublicRoute('/public/about/financials');
    revalidatePublicRoute('/public/about/partners');
    revalidatePublicRoute('/public/news');
    revalidatePublicRoute('/public/news/[slug]');
    revalidatePublicRoute('/public/stories');
    revalidatePublicRoute('/public/stories/[slug]');
}

/** Revalidate the events hub + detail pages (admin event writes). */
export function revalidatePublicEventRoutes(): void {
    revalidatePublicRoute('/public');
    revalidatePublicRoute('/public/events');
    revalidatePublicRoute('/public/events/[slug]');
}

/** Revalidate program pillar/category/project pages (admin project writes). */
export function revalidatePublicProgramRoutes(): void {
    revalidatePublicRoute('/public');
    revalidatePublicRoute('/public/programs');
    revalidatePublicRoute('/public/programs/[category]');
    revalidatePublicRoute('/public/programs/[category]/[slug]');
}

/** Revalidate the volunteer role board (admin volunteer-role writes). */
export function revalidatePublicVolunteerRoutes(): void {
    revalidatePublicRoute('/public');
    revalidatePublicRoute('/public/get-involved/volunteer');
}

/** Revalidate the homepage rails only (featured-flag changes). */
export function revalidatePublicHomepage(): void {
    revalidatePublicRoute('/public');
}