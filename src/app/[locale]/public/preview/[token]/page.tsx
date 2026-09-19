import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getContentPreview } from "@/actions/public";
import { resolveLocaleContent, parseLegacyTranslations } from "@/lib/content/translations";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";

export const dynamic = "force-dynamic";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string; token: string }>;
}): Promise<Metadata> {
    // Draft previews must never be indexed.
    return { robots: { index: false, follow: false } };
}

export default async function ContentPreviewPage({
    params,
}: {
    params: Promise<{ locale: string; token: string }>;
}) {
    const { locale, token } = await params;
    const { data: preview } = await getContentPreview(token);
    if (!preview) notFound();

    const rows: Partial<Record<string, Record<string, unknown>>> = {};
    for (const [loc, t] of Object.entries(preview.translations ?? {})) {
        const c = (t.content ?? {}) as Record<string, unknown>;
        rows[loc] = {
            title: t.title,
            ...c,
            meta_title: t.meta_title,
            meta_description: t.meta_description,
            cover_alt_text: t.cover_alt_text,
            cta_label: t.cta_label,
            cta_url: t.cta_url,
            category_label: t.category_label,
        };
    }
    const legacy = parseLegacyTranslations(preview.content);
    const resolved = resolveLocaleContent(locale, rows as never, preview.content, legacy);

    const content = (resolved.value ?? preview.content) as Record<string, unknown>;
    const str = (k: string): string | undefined =>
        typeof content[k] === "string" && (content[k] as string).trim() ? ((content[k] as string)) : undefined;

    return (
        <main className="container mx-auto max-w-3xl px-4 py-16">
            <div className="mb-6 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Draft preview — not published</Badge>
                <Badge variant="outline" className="capitalize">{preview.workflow_state.replace(/_/g, " ")}</Badge>
                {resolved.usedFallback && (
                    <Badge variant="outline">
                        Showing {resolved.locale} fallback ({SUPPORTED_LOCALES.includes(locale as never) ? `no ${locale} translation yet` : `unknown locale`})
                    </Badge>
                )}
            </div>
            <p className="mb-2 font-mono text-xs text-muted-foreground">/{preview.slug}</p>
            <h1 className="mb-4 font-serif text-4xl font-bold">{str("title") ?? preview.title}</h1>
            {(str("lead") || str("subheadline") || preview.meta_description) && (
                <p className="mb-6 text-lg text-muted-foreground">
                    {str("lead") ?? str("subheadline") ?? preview.meta_description}
                </p>
            )}
            {preview.cover_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={preview.cover_image_url}
                    alt={str("cover_alt_text") ?? preview.title}
                    className="mb-6 w-full rounded-2xl object-cover"
                />
            )}
            {str("body") && <p className="whitespace-pre-wrap leading-relaxed">{str("body")}</p>}
            <details className="mt-10 rounded-lg border p-4">
                <summary className="cursor-pointer text-sm font-semibold">All content fields (debug)</summary>
                <pre className="mt-2 overflow-auto font-mono text-xs">{JSON.stringify(content, null, 2)}</pre>
            </details>
        </main>
    );
}
