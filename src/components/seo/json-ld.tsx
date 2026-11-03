import { jsonLdForPage } from '@/lib/seo';

/**
 * P1: executable structured data.
 * Renders Organization/WebPage(/Article/Event/Donate/Breadcrumb) JSON-LD as
 * <script type="application/ld+json">. Use in public server components:
 *   <JsonLd locale={locale} path="/public/about" title={...} description={...} />
 * Article/event pages should prefer buildArticleSchema /
 * buildEventSchemaFromData for real CMS data over the generic graph.
 */
export function JsonLd(options: {
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
    const { locale, path, title, description, ...rest } = options;
    const graph = jsonLdForPage({ locale, path, title, description, ...rest });
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
        />
    );
}
