"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportBuilder, type ReportDraft } from "@/components/admin/report-builder";
import { updateReport } from "@/actions/reporting";
import type { ReportDefinition } from "@/types/domain/reporting";
import { FileBarChart, Loader2 } from "lucide-react";

export function ReportEditForm({ report }: { report: ReportDefinition }) {
    const router = useRouter();
    const t = useTranslations("Admin.Reporting.Edit");
    const [draft, setDraft] = useState<ReportDraft>({
        name: report.name,
        slug: report.slug,
        description: report.description ?? "",
        entity_type: report.entity_type,
        filters: report.filters ?? {},
        grouping: report.grouping ?? [],
        metrics: report.metrics ?? [],
        sort_field: report.sort_field,
        sort_direction: report.sort_direction,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSave() {
        if (!draft.name.trim() || !draft.slug.trim()) {
            setError(t("required"));
            return;
        }
        setLoading(true);
        setError(null);
        const result = await updateReport(report.id, {
            name: draft.name.trim(),
            slug: draft.slug.trim(),
            description: draft.description.trim() || null,
            entity_type: draft.entity_type,
            filters: draft.filters,
            grouping: draft.grouping,
            metrics: draft.metrics,
            sort_field: draft.sort_field,
            sort_direction: draft.sort_direction,
        });
        setLoading(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        router.refresh();
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <FileBarChart className="h-4 w-4 text-indigo-500" /> {t("def_title")}
                </CardTitle>
                <CardDescription>{t("def_description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                <ReportBuilder value={draft} onChange={setDraft} />
                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? t("saving") : t("save")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
