import { Metadata } from "next";
import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArticleDeepDiveViewModel } from "@/types/domain-adapters";

import { ArticleHeader } from "@/components/news/article/article-header";
import { ShareBar } from "@/components/news/article/share-bar";
import { KeyTakeaways } from "@/components/news/article/key-takeaways";
import { AuthorBio } from "@/components/news/article/author-bio";
import { NewsGrid } from "@/components/news/news-grid";
import { NewsSubscribe } from "@/components/news/news-extras";
import { getPublicArticleBySlug, getPublicNewsArticles } from "@/actions/public";
import { toArticleDeepDiveViewModel, toNewsViewModel } from "@/lib/content/public-mappers";

// NOTE: must stay an inline literal — Next's static segment-config
// analysis cannot resolve imported values (300 = PUBLIC_REVALIDATE_SECONDS).
export const revalidate = 300;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const article = await getArticle(slug);
    if (!article) return { title: "Article Not Found" };
    return {
        title: article.title,
        description: article.excerpt,
        openGraph: {
            title: article.title,
            description: article.excerpt,
            type: "article",
            images: article.imageSrc ? [article.imageSrc] : undefined,
        },
    };
}

/**
 * Reads the published article plus up to three related articles from the
 * same category (falling back to the newest published articles).
 *
 * Cached: generateMetadata + the page component share one execution.
 */
const getArticle = cache(async (slug: string): Promise<ArticleDeepDiveViewModel | null> => {
    const { data } = await getPublicArticleBySlug(slug);
    if (!data) return null;

    const { data: others } = await getPublicNewsArticles(12);
    const related = (others ?? [])
        .filter((a) => a.slug !== slug)
        .sort((a, b) => {
            const aSame = a.category === data.category ? 1 : 0;
            const bSame = b.category === data.category ? 1 : 0;
            return bSame - aSame;
        })
        .slice(0, 3)
        .map(toNewsViewModel);

    return toArticleDeepDiveViewModel(data, related);
});

export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
    const { locale, slug } = await params;
    const t = await getTranslations({ locale, namespace: "News.Article" });

    const article = await getArticle(slug);

    if (!article) notFound();

    return (
        <main className="bg-background min-h-screen">
            <ShareBar title={article.title} />

            <ArticleHeader article={article} />

            {/* Featured Image - Breaking out of container */}
            <div className="w-full h-[50vh] md:h-[70vh] relative mb-16 md:mb-24">
                <Image
                    src={article.imageSrc}
                    alt={article.title}
                    fill
                    className="object-cover"
                    priority
                />
            </div>

            {/* Body */}
            <article className="container mx-auto px-4 max-w-[800px]">
                {/* Takeaways */}
                <KeyTakeaways points={article.keyTakeaways || []} />

                {/* Prose Content */}
                <div
                    className="prose prose-lg prose-slate dark:prose-invert max-w-none 
                    prose-headings:font-serif prose-headings:font-bold prose-headings:text-foreground
                    prose-p:text-muted-foreground prose-p:leading-relaxed
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-blockquote:border-l-4 prose-blockquote:border-brand-radiant-gold prose-blockquote:bg-muted/20 prose-blockquote:p-6 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
                    prose-li:text-muted-foreground
                    "
                    dangerouslySetInnerHTML={{ __html: article.content }}
                />

                {/* Footer */}
                <div className="border-t border-border mt-16 pt-16">
                    <AuthorBio author={article.author} />
                </div>
            </article>

            {/* Related */}
            <section className="bg-muted/30 py-24 mt-24">
                <div className="container mx-auto px-4">
                    <h3 className="text-3xl font-serif font-bold text-center mb-12">{t("related")}</h3>
                    <NewsGrid articles={article.relatedArticles} />
                </div>
            </section>

            <NewsSubscribe />
        </main>
    );
}
