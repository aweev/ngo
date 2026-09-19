import { notFound } from "next/navigation";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/navigation";
import { getContentPage, getPageTranslations, getPageApprovals, getPageRevisions } from "@/actions/content";
import { getContentBlocks } from "@/actions/content-blocks";
import { getMediaLibrary } from "@/actions/media";
import { canTransitionWorkflow, type ContentWorkflowState } from "@/lib/content/translations";
import { missingRecommendedKeys } from "@/lib/content/slug";
import EditorForm from "./editor-form";
import WorkflowCard from "./workflow-card";
import TranslationsEditor, { type TranslationRow } from "./translations-editor";
import BlocksEditor, { type BlockRow } from "./blocks-editor";
import MediaPanel, { type MediaRow } from "./media-panel";
import HistoryPanel, { type ApprovalRow, type RevisionRow } from "./history-panel";
import DangerZone from "./danger-zone";

export const dynamic = "force-dynamic";

const ALL_WORKFLOW_STATES: ContentWorkflowState[] = [
    "draft",
    "translation_pending",
    "in_review",
    "changes_requested",
    "approved",
    "published",
    "archived",
];

export default async function ContentEditPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;
    const { data: page, error } = await getContentPage(id);
    if (error || !page) notFound();

    const p = page as unknown as {
        id: string;
        title: string;
        slug: string;
        status: string;
        workflow_state?: string;
        content: Record<string, unknown>;
        meta_title: string | null;
        meta_description: string | null;
        cover_image_url: string | null;
        preview_token?: string | null;
    };

    const [translationsRes, blocksRes, approvalsRes, revisionsRes, mediaRes] = await Promise.all([
        getPageTranslations(id),
        getContentBlocks(id),
        getPageApprovals(id),
        getPageRevisions(id),
        getMediaLibrary(undefined, 24),
    ]);

    const current = (p.workflow_state ?? "draft") as ContentWorkflowState;
    const allowed = ALL_WORKFLOW_STATES.filter((s) => s !== current && canTransitionWorkflow(current, s));
    const category = typeof p.content.category === "string" ? p.content.category : "page";
    const missing = missingRecommendedKeys(p.slug, category, p.content);
    const aiConfigured =
        !!process.env.CMS_TRANSLATION_PROVIDER &&
        (!!process.env.CMS_TRANSLATION_API_KEY || !!process.env.OPENAI_API_KEY);

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href="/admin/content">
                        <ArrowLeft className="h-4 w-4" /> Back to Pages
                    </Link>
                </Button>
            </div>

            <PageHeader
                title={p.title}
                description={`/${p.slug}`}
                action={
                    <div className="flex gap-2">
                        <Badge variant={p.status === "published" ? "default" : "secondary"} className="capitalize">
                            {p.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                            {current.replace(/_/g, " ")}
                        </Badge>
                    </div>
                }
            />

            <WorkflowCard
                pageId={p.id}
                current={current}
                allowed={allowed}
                previewToken={p.preview_token ?? null}
                locale={locale}
            />

            <EditorForm
                page={{
                    id: p.id,
                    title: p.title,
                    slug: p.slug,
                    content: p.content ?? {},
                    meta_title: p.meta_title,
                    meta_description: p.meta_description,
                    cover_image_url: p.cover_image_url,
                }}
                missingKeys={missing}
            />

            <TranslationsEditor
                pageId={p.id}
                pageSlug={p.slug}
                rows={((translationsRes.data ?? []) as unknown as TranslationRow[])}
                aiConfigured={aiConfigured}
            />

            <BlocksEditor pageId={p.id} initial={((blocksRes.data ?? []) as unknown as BlockRow[])} />

            <MediaPanel initial={((mediaRes.data ?? []) as unknown as MediaRow[])} />

            <HistoryPanel
                pageId={p.id}
                approvals={((approvalsRes.data ?? []) as unknown as ApprovalRow[])}
                revisions={((revisionsRes.data ?? []) as unknown as RevisionRow[])}
                previewToken={p.preview_token ?? null}
                locale={locale}
            />

            <DangerZone pageId={p.id} slug={p.slug} status={p.status} />
        </div>
    );
}
