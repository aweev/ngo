"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { restorePageRevision, rotatePreviewToken } from "@/actions/content";
import { Copy, RefreshCw, History } from "lucide-react";
import { useTranslations } from "next-intl";

export type ApprovalRow = {
    id: string;
    status: string;
    reviewer_id: string | null;
    review_notes: string | null;
    created_at: string;
    reviewed_at: string | null;
};

export type RevisionRow = {
    id: string;
    title: string;
    slug: string;
    status: string;
    workflow_state: string;
    created_at: string;
};

export default function HistoryPanel({
    pageId,
    approvals,
    revisions,
    previewToken,
    locale,
}: {
    pageId: string;
    approvals: ApprovalRow[];
    revisions: RevisionRow[];
    previewToken: string | null;
    locale: string;
}) {
    const t = useTranslations("Admin.Content.History");
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirmDelete] = useState("");
    void confirmDelete;

    const restore = async (revisionId: string) => {
        if (!window.confirm(t("restore_confirm"))) return;
        setBusy(`restore:${revisionId}`);
        setError(null);
        const res = await restorePageRevision(pageId, revisionId);
        setBusy(null);
        if (res.error) setError(res.error);
        else window.location.reload();
    };

    const rotate = async () => {
        if (!window.confirm(t("rotate_confirm"))) return;
        setBusy("rotate");
        setError(null);
        const res = await rotatePreviewToken(pageId);
        setBusy(null);
        if (res.error) setError(res.error);
        else window.location.reload();
    };

    const copyPreview = async () => {
        if (!previewToken) return;
        const url = `${window.location.origin}/${locale}/public/preview/${previewToken}`;
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            setError(t("copy_failed"));
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4" /> {t("title")}
                    </CardTitle>
                    <CardDescription>{t("description")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {revisions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("no_revisions")}</p>
                    ) : (
                        <ul className="space-y-2">
                            {revisions.map((r) => (
                                <li key={r.id} className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold">{r.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(r.created_at).toLocaleString()} · {r.workflow_state}
                                        </p>
                                    </div>
                                    <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => restore(r.id)}>
                                        {busy === `restore:${r.id}` ? t("restoring") : t("restore")}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("approval_title")}</CardTitle>
                    <CardDescription>{t("approval_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {approvals.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("no_approvals")}</p>
                    ) : (
                        <ul className="space-y-2">
                            {approvals.map((a) => (
                                <li key={a.id} className="rounded-md border p-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={a.status === "approved" ? "default" : "secondary"} className="text-[11px]">
                                            {a.status.replace(/_/g, " ")}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                                    </div>
                                    {a.review_notes && <p className="mt-1 text-xs">{a.review_notes}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("preview_title")}</CardTitle>
                    <CardDescription>{t("preview_description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {previewToken ? (
                        <>
                            <div className="flex gap-2">
                                <Input readOnly value={`/${locale}/public/preview/${previewToken}`} className="font-mono text-xs" />
                                <Button size="sm" variant="outline" className="gap-1" onClick={copyPreview}>
                                    <Copy className="h-3.5 w-3.5" /> Copy
                                </Button>
                            </div>
                            <Button size="sm" variant="outline" className="gap-1" disabled={busy !== null} onClick={rotate}>
                                <RefreshCw className="h-3.5 w-3.5" />
                                {busy === "rotate" ? t("rotating") : t("rotate")}
                            </Button>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t("missing_migration")}</p>
                    )}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </CardContent>
            </Card>
        </div>
    );
}
