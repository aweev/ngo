import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { StoryViewModel } from "@/types/domain-adapters";

import { StoriesHero } from "@/components/stories/stories-hero";
import { FilterBar } from "@/components/stories/filter-bar";
import { FeaturedStory } from "@/components/stories/featured-story";
import { StoryCard } from "@/components/stories/story-card";
import { ImpactInterstitial } from "@/components/stories/impact-interstitial";
import { Button } from "@/components/ui/button";
import { getPublicImpactStories, getPublicStats } from "@/actions/public";
import { toStoryViewModel } from "@/lib/content/public-mappers";
import { buildPublicMetadata } from "@/lib/seo";

// ISR: story publishing is an editorial event, purged by
// revalidatePublicContentRoutes() on admin writes.
// NOTE: must stay an inline literal — Next's static segment-config
// analysis cannot resolve imported values (300 = PUBLIC_REVALIDATE_SECONDS).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Stories.Hero" });
    return buildPublicMetadata({
        locale,
        path: '/public/stories',
        title: t("headline"),
        description: t("subheadline"),
        ogImage: undefined,
        publishedTime: undefined,
        modifiedTime: undefined,
        authors: undefined,
        section: 'Stories',
        tags: ['stories', 'impact', 'testimonials', 'success stories', 'beneficiaries'],
    });
}

/**
 * Reads published stories from the `public_impact_stories` view.
 * Format/role/programme filtering happens in-memory over the newest 60
 * published stories so the anon read stays a single cached query.
 */
async function getStories(
    searchParams: Record<string, string | undefined>,
): Promise<{ stories: StoryViewModel[]; total: number }> {
    const { data } = await getPublicImpactStories(60);
    const all = (data ?? []).map(toStoryViewModel);

    const format = searchParams.format;
    const role = searchParams.role;
    const program = searchParams.program;
    const q = searchParams.q?.toLowerCase().trim();

    const filtered = all.filter((story) => {
        const matchesFormat = !format || format === 'all' || story.type === format;
        const matchesRole = !role || role === 'all' || story.role === role;
        const matchesProgram = !program || program === 'all' || story.program === program;
        const matchesSearch =
            !q ||
            story.title.toLowerCase().includes(q) ||
            story.summary.toLowerCase().includes(q);
        return matchesFormat && matchesRole && matchesProgram && matchesSearch;
    });

    return { stories: filtered, total: filtered.length };
}

/** Lives-touched counter for the interstitial, from the public stats RPC. */
async function getImpactCount(): Promise<number> {
    const stats = await getPublicStats();
    return stats.totalBeneficiaries ?? 0;
}

export default async function StoriesPage({
    params,
    searchParams
}: {
    params: Promise<{ locale: string }>,
    searchParams: Promise<Record<string, string | undefined>>
}) {
    const { locale } = await params;
    const query = await searchParams;
    const t = await getTranslations({ locale, namespace: "Stories.Grid" });

    const { stories, total } = await getStories(query);
    const impactCount = await getImpactCount();

    // Featured Logic: If searching, disable featured. If page 1, show it.
    const showFeatured = !query.q && (!query.page || query.page === '1');
    const featuredStory = showFeatured ? stories.find(s => s.isFeatured) || stories[0] : null;
    const gridStories = showFeatured ? stories.filter(s => s.id !== featuredStory?.id) : stories;

    return (
        <main className="pb-24">
            <StoriesHero />

            <div className="relative min-h-screen">
                <FilterBar />

                {featuredStory && <FeaturedStory story={featuredStory} />}

                {/* Interstitial between featured and grid */}
                <ImpactInterstitial totalLives={impactCount} />

                <div className="container mx-auto px-4 mt-12">
                    {gridStories.length > 0 ? (
                        <>
                            {/* Masonry Grid Layout using CSS Columns */}
                            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                                {gridStories.map((story) => (
                                    <StoryCard key={story.id} story={story} />
                                ))}
                            </div>

                            {/* Simple Pagination CTA */}
                            {total > stories.length && (
                                <div className="mt-16 text-center">
                                    <Button variant="outline" size="lg" className="rounded-full">
                                        {t("load_more")}
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-20 text-muted-foreground">
                            <p>{t("no_results")}</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}