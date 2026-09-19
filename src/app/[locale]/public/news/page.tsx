import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NewsViewModel } from "@/types/domain-adapters";

import { NewsHero } from "@/components/news/news-hero";
import { FeaturedArticle } from "@/components/news/featured-article";
import { CategoryNav } from "@/components/news/category-nav";
import { NewsGrid } from "@/components/news/news-grid";
import { NewsSubscribe, MediaKit } from "@/components/news/news-extras";
import { getPublicNewsArticles } from "@/actions/public";
import { toNewsViewModel } from "@/lib/content/public-mappers";

// ISR: published articles change rarely; admin writes purge via
// revalidatePublicContentRoutes().
// NOTE: must stay an inline literal — Next's static segment-config
// analysis cannot resolve imported values (300 = PUBLIC_REVALIDATE_SECONDS).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "News.Hub" });
    return {
        title: t("hero_title"),
        description: t("hero_subtitle")
    };
}

/**
 * Reads published articles from the `public_news_articles` view.
 * Category/search filtering is applied in-memory: the hub loads the
 * newest 60 published articles, which is well within one page of
 * editorial output and keeps the anon client cacheable.
 */
async function getNews(searchParams: Record<string, string | undefined>): Promise<NewsViewModel[]> {
    const { data } = await getPublicNewsArticles(60);
    const articles = (data ?? []).map(toNewsViewModel);

    const cat = searchParams.category;
    const q = searchParams.q?.toLowerCase().trim();

    return articles.filter((item) => {
        const matchesCat = !cat || cat === 'all' || item.category === cat;
        const matchesSearch =
            !q ||
            item.title.toLowerCase().includes(q) ||
            item.excerpt.toLowerCase().includes(q);
        return matchesCat && matchesSearch;
    });
}

export default async function NewsPage({
    params,
    searchParams
}: {
    params: Promise<{ locale: string }>,
    searchParams: Promise<Record<string, string | undefined>>
}) {
    await params; // Next.js 15
    const query = await searchParams; // Next.js 15
    const news = await getNews(query);

    // If searching or filtering, don't show "Featured" differently
    const isFiltered = query.q || (query.category && query.category !== 'all');
    const featured = !isFiltered && news.length > 0 ? news[0] : null;
    const gridItems = featured ? news.slice(1) : news;

    return (
        <main className="bg-background min-h-screen pb-24">
            <NewsHero />

            <CategoryNav />

            {featured && <FeaturedArticle article={featured} />}

            <NewsGrid articles={gridItems} />

            <NewsSubscribe />

            <MediaKit />
        </main>
    );
}