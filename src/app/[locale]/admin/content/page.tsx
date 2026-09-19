import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getContentPages } from "@/actions/content";
import { Plus, FileText, Languages, Sparkles, ShieldAlert, TriangleAlert } from "lucide-react";
import { Link } from "@/lib/navigation";
import { SUPPORTED_LOCALES, LOCALE_SHORT, type SupportedLocale } from "@/lib/i18n/locales";

export const dynamic = "force-dynamic";

type PageRow = {
    id: string;
    title: string;
    slug: string;
    status: string;
    workflow_state?: string;
    approval_status?: string;
    translations?: Record<string, unknown> | null;
    translation_status?: Record<string, unknown> | null;
    content?: Record<string, unknown> | null;
};

function localeCoverage(page: PageRow): { locale: SupportedLocale; present: boolean; status: string }[] {
    const fromColumn = (page.translations ?? {}) as Record<string, unknown>;
    const legacyContent = (page.content ?? {}) as Record<string, unknown>;
    const legacy = ((legacyContent.translations ?? legacyContent.locales ?? {}) as Record<string, unknown>);
    const statusMap = ((page.translation_status ?? {}) as Record<string, unknown>);
    return SUPPORTED_LOCALES.map((locale) => {
        const present =
            (fromColumn[locale] !== undefined && fromColumn[locale] !== null) ||
            (legacy[locale] !== undefined && legacy[locale] !== null);
        const rawStatus = statusMap[locale];
        const status = typeof rawStatus === "string" ? rawStatus : present ? "draft" : "missing";
        return { locale, present, status };
    });
}

function approvalBadge(page: PageRow) {
    const approval = page.approval_status ?? (page.status === "published" ? "approved" : "draft");
    if (approval === "approved") {
        return (
            <Badge variant="outline" className="gap-1 text-[11px]">
                Approved
            </Badge>
        );
    }
    if (approval === "pending_approval") {
        return <Badge variant="secondary" className="text-[11px]">In review</Badge>;
    }
    if (approval === "rejected") {
        return <Badge variant="destructive" className="text-[11px]">Changes requested</Badge>;
    }
    return <Badge variant="secondary" className="text-[11px]">Draft — not approved</Badge>;
}

export default async function ContentPage() {
    const { data: pages } = await getContentPages();
    const rows = ((pages ?? []) as unknown as PageRow[]);

    const aiConfigured =
        !!process.env.CMS_TRANSLATION_PROVIDER &&
        (!!process.env.CMS_TRANSLATION_API_KEY || !!process.env.OPENAI_API_KEY);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Content pages"
                description="Draft, translate (EN, DE, FR, ES, AR), request review, and publish. Publishing requires approval and the content.publish permission."
                action={
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="gap-2 text-xs"
                            disabled={!aiConfigured}
                            title={
                                aiConfigured
                                    ? "AI translation is configured"
                                    : "AI translation is not configured — set CMS_TRANSLATION_PROVIDER and CMS_TRANSLATION_API_KEY to enable it. Manual translation remains available."
                            }
                        >
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            {aiConfigured ? "AI Translation" : "AI Translation (not configured)"}
                        </Button>
                        <Button asChild className="gap-2">
                            <Link href="/admin/content/new">
                                <Plus className="h-4 w-4" />
                                New Page
                            </Link>
                        </Button>
                    </div>
                }
            />

            {!aiConfigured && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                        AI translation is not enabled in this environment. Add translations manually per
                        locale. When AI translation is enabled,{" "}
                        <strong>AI-generated text always requires human review</strong> before approval
                        or publishing.
                    </p>
                </div>
            )}

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Page Title</TableHead>
                            <TableHead>URL Slug</TableHead>
                            <TableHead>Locales</TableHead>
                            <TableHead>Workflow</TableHead>
                            <TableHead>Approval</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                                    No CMS pages created yet. Click &quot;New Page&quot; to create a page, then add
                                    translations per locale before requesting review.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((p) => {
                                const coverage = localeCoverage(p);
                                const present = coverage.filter((c) => c.present);
                                return (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-semibold text-sm">
                                            <Link href={`/admin/content/${p.id}`} className="flex items-center gap-2 hover:underline">
                                                <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                                                <span>{p.title}</span>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-muted-foreground">/{p.slug}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5" title={coverage.map((c) => `${c.locale}: ${c.status}`).join(", ")}>
                                                <Languages className="h-3.5 w-3.5 text-purple-500" />
                                                <span className="text-xs font-mono">
                                                    {present.length === 0
                                                        ? "EN only — no translations"
                                                        : present.map((c) => LOCALE_SHORT[c.locale]).join(", ")}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {present.length}/{SUPPORTED_LOCALES.length}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {coverage.map((c) => (
                                                    <span
                                                        key={c.locale}
                                                        className={`inline-block rounded px-1 py-0.5 font-mono text-[10px] leading-none ${c.present
                                                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                                                            : "bg-muted text-muted-foreground"
                                                            }`}
                                                        title={`${c.locale}: ${c.status}`}
                                                    >
                                                        {LOCALE_SHORT[c.locale]}
                                                    </span>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize text-[11px]">
                                                {(p.workflow_state ?? p.status ?? "draft").replace(/_/g, " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                {approvalBadge(p)}
                                                {(p.workflow_state === "in_review" || p.approval_status === "pending_approval") && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                                        <ShieldAlert className="h-3 w-3" />
                                                        awaiting review
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={p.status === "published" ? "default" : "secondary"} className="capitalize">
                                                {p.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
