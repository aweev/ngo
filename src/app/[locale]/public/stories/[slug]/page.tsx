import { Metadata } from "next";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { StoryDeepDiveViewModel, StoryViewModel } from "@/types/domain-adapters";

import { StoryHeader } from "@/components/stories/detail/story-header";
import { MediaPlayer } from "@/components/stories/detail/media-player";
import { JourneyTimeline } from "@/components/stories/detail/journey-timeline";
import { StoryActionBar } from "@/components/stories/detail/action-bar";
import { StoryCard } from "@/components/stories/story-card";
import { getPublicImpactStoryBySlug, getPublicImpactStories } from "@/actions/public";
import { toStoryDeepDiveViewModel, toStoryViewModel } from "@/lib/content/public-mappers";
import { buildPublicMetadata, buildArticleSchema } from "@/lib/seo";

// ISR: purged by revalidatePublicContentRoutes() whenever a story is
// published, unpublished or edited in /admin/content/stories.
// NOTE: must stay an inline literal — Next's static segment-config
// analysis cannot resolve imported values (300 = PUBLIC_REVALIDATE_SECONDS).
export const revalidate = 300;

/**
 * Loads a published story plus up to 3 related stories (same programme
 * first) from the `public_impact_stories` view. Returns null so the page
 * can call notFound() for drafts, unpublished and unknown slugs.
 *
 * Cached: generateMetadata + the page component share one execution
 * instead of 2x (bySlug + related) Supabase round-trips each.
 */
const getStory = cache(async (slug: string): Promise<StoryDeepDiveViewModel | null> => {
    const { data, error } = await getPublicImpactStoryBySlug(slug);
    if (error || !data) return null;

    const { data: others } = await getPublicImpactStories(12);
    const candidates = (others ?? []).filter((row) => row.slug !== slug);
    const ordered = [
        ...candidates.filter((row) => row.program && row.program === data.program),
        ...candidates.filter((row) => !row.program || row.program !== data.program),
    ];
    const relatedStories: StoryViewModel[] = ordered.slice(0, 3).map(toStoryViewModel);

    return toStoryDeepDiveViewModel(data, relatedStories);
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
    const { locale, slug } = await params;
    const story = await getStory(slug);
    if (!story) return { title: "Story Not Found" };
    
    return buildPublicMetadata({
        locale,
        path: `/public/stories/${slug}`,
        title: story.title,
        description: story.summary,
        ogImage: story.imageSrc,
        publishedTime: story.publishedAt,
        modifiedTime: story.publishedAt,
        authors: [story.author.name],
        section: story.program,
        tags: [story.type, story.role, story.program].filter(Boolean),
    });
}

export default async function StoryDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params;
    const t = await getTranslations({ locale, namespace: "Stories.Detail" });
    const story = await getStory(slug);

    if (!story) notFound();

    return (
        <main className="bg-background min-h-screen pb-24">
            <StoryHeader story={story} />

            <MediaPlayer story={story} />

            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-24">

                    {/* Main Narrative */}
                    <div className="lg:col-span-8">
                        {/* Typography styles handle the HTML content */}
                        <article className="prose prose-lg dark:prose-invert prose-headings:font-serif prose-headings:font-bold prose-primary max-w-none text-foreground/80 first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:text-primary">
                            <div dangerouslySetInnerHTML={{ __html: story.content }} />
                        </article>

                        <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground italic">
                            {t("Consent.notice")}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="lg:col-span-4 space-y-12">
                        <JourneyTimeline events={story.timeline} />

                        <div className="hidden lg:block sticky top-[500px]">
                            <StoryActionBar name={story.author.name} program={story.program} />
                        </div>
                    </aside>
                </div>
            </div>

            {/* Mobile Sticky Action Bar */}
            <div className="lg:hidden">
                <StoryActionBar name={story.author.name} program={story.program} />
            </div>

            {/* Recommendations */}
            <div className="bg-muted/20 border-t border-border mt-24 py-24">
                <div className="container mx-auto px-4">
                    <h3 className="text-3xl font-serif font-bold mb-12 text-center">
                        {t("Related.title", { program: story.program })}
                    </h3>
                    <div className="grid md:grid-cols-3 gap-8">
                        {story.relatedStories.map(related => (
                            <StoryCard key={related.id} story={related} />
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
