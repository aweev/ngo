import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import { NarrativeHero } from "@/components/about/narrative-hero";
import { MissionVision } from "@/components/about/mission-vision";
import { HistoryTimeline } from "@/components/about/history-timeline";
import { CoreValues, TheoryOfChange } from "@/components/about/values-theory";
import { ExploreNav } from "@/components/about/explore-nav";
import {
    getPublicContentPage,
    getPublicMilestones,
    type PublicContentPage,
} from "@/actions/public";
import { buildPublicMetadata } from "@/lib/seo";

export const revalidate = 300;

// --- Admin-driven helpers (admin command center = single source of truth) ---
// Managed in /admin/content with slugs:
// `about-hero`, `about-mission-vision`, `about-values`, `about-theory`
// Milestones: content_pages with content.category = 'milestone'.

function str(content: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
    if (!content) return undefined;
    for (const key of keys) {
        const v = content[key];
        if (typeof v === "string" && v.trim().length > 0) return v.trim();
    }
    return undefined;
}

function strArray(content: Record<string, unknown> | undefined, ...keys: string[]): string[] | undefined {
    if (!content) return undefined;
    for (const key of keys) {
        const v = content[key];
        if (Array.isArray(v)) {
            const arr = (v as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0);
            if (arr.length > 0) return arr;
        }
        if (typeof v === "string" && v.trim().length > 0) {
            // Support comma-separated strings as well as JSON arrays stored as text
            try {
                const parsed = JSON.parse(v);
                if (Array.isArray(parsed)) {
                    const arr = parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
                    if (arr.length > 0) return arr;
                }
            } catch {
                // not JSON — fall through to comma split
            }
            const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
            if (arr.length > 0) return arr;
        }
    }
    return undefined;
}

function buildHeroContent(page: PublicContentPage | null) {
    if (!page) return undefined;
    const c = (page.content ?? {}) as Record<string, unknown>;
    const images =
        strArray(c, "images", "gallery_urls", "gallery", "image_urls") ??
        (() => {
            const single = str(c, "image_src", "imageSrc");
            const cover = page.cover_image_url ?? undefined;
            const collected = [single, cover].filter((x): x is string => !!x);
            return collected.length > 0 ? collected : undefined;
        })();
    const preheader = str(c, "preheader");
    const headline = str(c, "headline") ?? page.title ?? undefined;
    const lead = str(c, "lead", "subheadline", "subtitle", "description") ?? page.meta_description ?? undefined;
    if (!preheader && !headline && !lead && !images) return undefined;
    return {
        ...(preheader ? { preheader } : {}),
        ...(headline ? { headline } : {}),
        ...(lead ? { lead } : {}),
        ...(images ? { images } : {}),
    } as { preheader: string; headline: string; lead: string; images: string[] };
}

function buildMissionVisionContent(page: PublicContentPage | null) {
    if (!page) return undefined;
    const c = (page.content ?? {}) as Record<string, unknown>;
    const missionTitle = str(c, "mission_title", "missionTitle");
    const missionText = str(c, "mission_text", "missionText", "mission_description", "missionDescription");
    const visionTitle = str(c, "vision_title", "visionTitle");
    const visionText = str(c, "vision_text", "visionText", "vision_description", "visionDescription");
    if (!missionTitle && !missionText && !visionTitle && !visionText) return undefined;
    return {
        ...(missionTitle ? { missionTitle } : {}),
        ...(missionText ? { missionText } : {}),
        ...(visionTitle ? { visionTitle } : {}),
        ...(visionText ? { visionText } : {}),
    } as { missionTitle: string; missionText: string; visionTitle: string; visionText: string };
}

function buildValuesProps(page: PublicContentPage | null) {
    if (!page) return { values: undefined as { title: string; description: string }[] | undefined, title: undefined as string | undefined };
    const c = (page.content ?? {}) as Record<string, unknown>;
    const raw = c.values;
    let values: { title: string; description: string }[] | undefined;
    if (Array.isArray(raw)) {
        values = (raw as Record<string, unknown>[])
            .map((v) => ({
                title: typeof v.title === "string" ? v.title : "",
                description:
                    typeof v.description === "string"
                        ? v.description
                        : typeof v.desc === "string"
                          ? v.desc
                          : "",
                ...(typeof v.icon === "string" ? { icon: v.icon } : {}),
            }))
            .filter((v) => v.title.trim().length > 0);
        if (values.length === 0) values = undefined;
    }
    const title = str(c, "title", "heading") ?? (values ? page.title : undefined);
    return { values, title };
}

function buildTheoryContent(page: PublicContentPage | null) {
    if (!page) return undefined;
    const c = (page.content ?? {}) as Record<string, unknown>;
    const raw = c.steps;
    let steps: { title: string; description: string }[] | undefined;
    if (Array.isArray(raw)) {
        steps = (raw as Record<string, unknown>[])
            .map((s) => ({
                title: typeof s.title === "string" ? s.title : "",
                description:
                    typeof s.description === "string"
                        ? s.description
                        : typeof s.desc === "string"
                          ? s.desc
                          : "",
            }))
            .filter((s) => s.title.trim().length > 0);
        if (steps.length === 0) steps = undefined;
    }
    const title = str(c, "title", "heading") ?? page.title ?? undefined;
    const subtitle = str(c, "subtitle", "subheadline", "description") ?? page.meta_description ?? undefined;
    if (!title && !subtitle && !steps) return undefined;
    return {
        ...(title ? { title } : {}),
        ...(subtitle ? { subtitle } : {}),
        ...(steps ? { steps } : {}),
    } as { title: string; subtitle: string; steps: { title: string; description: string }[] };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "About.Hero" });
    let title = `About Us - ${t("headline")}`;
    let description = t("lead");
    try {
        const { data: heroPage } = await getPublicContentPage("about-hero", locale);
        const c = (heroPage?.content ?? {}) as Record<string, unknown>;
        const pageTitle = str(c, "headline") ?? heroPage?.title;
        const pageDescription = str(c, "lead", "subheadline", "subtitle", "description") ?? heroPage?.meta_description;
        if (pageTitle || pageDescription) {
            title = pageTitle ? `About Us - ${pageTitle}` : `About Us - ${t("headline")}`;
            description = pageDescription ?? t("lead");
        }
    } catch {
        // fall through to i18n defaults
    }
    return buildPublicMetadata({
        locale,
        path: '/public/about',
        title,
        description,
        ogImage: undefined, // Could be set from hero page cover_image_url
        publishedTime: undefined,
        modifiedTime: undefined,
        authors: undefined,
        section: 'About',
        tags: ['about', 'mission', 'vision', 'values', 'history', 'team'],
    });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "About.CTA" });

    // Admin command center: content_pages (`about-*`) + milestones category.
    // Components fall back to i18n copy when the DB has no rows yet.
    const [heroRes, missionRes, valuesRes, theoryRes, milestonesRes] = await Promise.all([
        getPublicContentPage("about-hero", locale),
        getPublicContentPage("about-mission-vision", locale),
        getPublicContentPage("about-values", locale),
        getPublicContentPage("about-theory", locale),
        getPublicMilestones(20, locale),
    ]);

    const heroPage = heroRes.data ?? null;
    const missionPage = missionRes.data ?? null;
    const valuesPage = valuesRes.data ?? null;
    const theoryPage = theoryRes.data ?? null;
    const milestones = (milestonesRes.data ?? []).map((m) => ({
        year: m.year,
        title: m.title,
        description: m.description,
    }));

    const heroContent = buildHeroContent(heroPage);
    const missionContent = buildMissionVisionContent(missionPage);
    const { values, title: valuesTitle } = buildValuesProps(valuesPage);
    const theoryContent = buildTheoryContent(theoryPage);

    return (
        <main className="pt-20"> {/* Offset fixed header */}
            {/* 1. HERO — admin: content `about-hero` */}
            <NarrativeHero content={heroContent} />
            {/* 2. MISSION / VISION — admin: content `about-mission-vision` */}
            <MissionVision content={missionContent} />
            {/* 3. HISTORY — admin: content category `milestone` */}
            <HistoryTimeline milestones={milestones.length > 0 ? milestones : undefined} />
            {/* 4. VALUES — admin: content `about-values` (values[]) */}
            <CoreValues values={values} title={valuesTitle} />
            {/* 5. THEORY OF CHANGE — admin: content `about-theory` (steps[]) */}
            <TheoryOfChange content={theoryContent} />
            <ExploreNav />
            {/* Footer CTA */}
            <section className="py-24 bg-primary/5 text-center">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-serif font-bold mb-8 text-foreground">
                        {t("text")}
                    </h2>
                    <Button asChild size="lg" className="rounded-full px-8 h-14 text-base shadow-xl shadow-primary/20">
                        <Link href="/public/about/team">
                            {t("button")}
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                    </Button>
                </div>
            </section>
        </main>
    );
}
