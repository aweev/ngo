"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { archiveContentPage, deleteContentPage, unpublishContent } from "@/actions/content";
import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

export default function DangerZone({
    pageId,
    slug,
    status,
}: {
    pageId: string;
    slug: string;
    status: string;
}) {
    const router = useRouter();
    const t = useTranslations("Admin.Content.Danger");
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [confirm, setConfirm] = useState("");

    const runArchive = async () => {
        if (!window.confirm(t("archive_confirm"))) return;
        setBusy("archive");
        setError(null);
        const res = await archiveContentPage(pageId);
        setBusy(null);
        if (res.error) setError(res.error);
        else window.location.reload();
    };

    const runUnpublish = async () => {
        setBusy("unpublish");
        setError(null);
        const res = await unpublishContent(pageId);
        setBusy(null);
        if (res.error) setError(res.error);
        else window.location.reload();
    };

    const runDelete = async () => {
        setBusy("delete");
        setError(null);
        const res = await deleteContentPage(pageId);
        setBusy(null);
        if (res.error) setError(res.error);
        else router.push("/admin/content");
    };

    return (
        <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                    <ShieldAlert className="h-4 w-4" /> {t("title")}
                </CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {status === "published" && (
                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={runUnpublish}>
                            {busy === "unpublish" ? t("unpublishing") : t("unpublish")}
                        </Button>
                    )}
                    {status !== "archived" && (
                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={runArchive}>
                            {busy === "archive" ? t("archiving") : t("archive")}
                        </Button>
                    )}
                </div>
                <div className="space-y-2 rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">
                        {t("delete_label", { slug })}
                    </p>
                    <div className="flex gap-2">
                        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={slug} className="font-mono" />
                        <Button
                            size="sm"
                            variant="destructive"
                            disabled={busy !== null || confirm.trim() !== slug}
                            onClick={runDelete}
                        >
                            {busy === "delete" ? t("deleting") : t("delete")}
                        </Button>
                    </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
            </CardContent>
        </Card>
    );
}
