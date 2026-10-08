"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createReport } from "@/actions/reporting";
import { PageHeader } from "@/components/manage/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileBarChart, Loader2 } from "lucide-react";
import { Link } from "@/lib/navigation";

const entityOptions = [
    "workers",
    "volunteers",
    "partners",
    "donors",
    "projects",
    "campaigns",
    "events",
] as const;

type EntityType = (typeof entityOptions)[number][0];

export default function NewReportPage() {
    const router = useRouter();
    const t = useTranslations("Admin.Reporting.New");
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [entityType, setEntityType] = useState<EntityType>("workers");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const entityLabels: Record<EntityType, string> = {
        workers: t("entities.workers"),
        volunteers: t("entities.volunteers"),
        partners: t("entities.partners"),
        donors: t("entities.donors"),
        projects: t("entities.projects"),
        campaigns: t("entities.campaigns"),
        events: t("entities.events"),
    };

    function updateName(value: string) {
        setName(value);
        setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!name.trim() || !slug.trim()) {
            setError(t("required"));
            return;
        }

        setLoading(true);
        setError(null);
        const result = await createReport({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim() || null,
            entity_type: entityType,
            filters: {},
            grouping: [],
            metrics: [],
            sort_field: null,
            sort_direction: "desc",
            schedule_job_id: null,
            created_by: null,
        });

        if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        router.push("/admin/reporting");
    }

    return (
        <div className="max-w-3xl space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/reporting"><ArrowLeft className="h-4 w-4" /> {t("back")}</Link>
            </Button>
            <PageHeader title={t("title")} description={t("description")} />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base"><FileBarChart className="h-4 w-4 text-indigo-500" /> {t("def_title")}</CardTitle>
                        <CardDescription>{t("def_description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label htmlFor="report-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("name_label")}</label>
                                <Input id="report-name" required value={name} onChange={(event) => updateName(event.target.value)} placeholder={t("name_placeholder")} />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="report-slug" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("slug_label")}</label>
                                <Input id="report-slug" required value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="monthly-volunteer-activity" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="report-entity" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("source_label")}</label>
                            <select id="report-entity" value={entityType} onChange={(event) => setEntityType(event.target.value as EntityType)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                {entityOptions.map((value) => (
                                    <option key={value} value={value}>
                                        {entityLabels[value]}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="report-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("description_label")}</label>
                            <Textarea id="report-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("description_placeholder")} />
                        </div>
                    </CardContent>
                </Card>
                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline"><Link href="/admin/reporting">{t("cancel")}</Link></Button>
                    <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{loading ? t("creating") : t("create")}</Button>
                </div>
            </form>
        </div>
    );
}
