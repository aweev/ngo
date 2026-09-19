"use client";

import { useState } from "react";
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
    ["workers", "Workers"],
    ["volunteers", "Volunteers"],
    ["partners", "Partners"],
    ["donors", "Donors"],
    ["projects", "Projects"],
    ["campaigns", "Campaigns"],
    ["events", "Events"],
] as const;

type EntityType = (typeof entityOptions)[number][0];

export default function NewReportPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [entityType, setEntityType] = useState<EntityType>("workers");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function updateName(value: string) {
        setName(value);
        setSlug(value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!name.trim() || !slug.trim()) {
            setError("A report name and URL slug are required.");
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
                <Link href="/admin/reporting"><ArrowLeft className="h-4 w-4" /> Back to Reports</Link>
            </Button>
            <PageHeader title="Build Report" description="Define a reusable report from an operational data source." />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base"><FileBarChart className="h-4 w-4 text-indigo-500" /> Report definition</CardTitle>
                        <CardDescription>Start with the scope. Filters, grouping, metrics, and scheduled delivery can be configured after creation.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label htmlFor="report-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Report name</label>
                                <Input id="report-name" required value={name} onChange={(event) => updateName(event.target.value)} placeholder="Monthly volunteer activity" />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="report-slug" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL slug</label>
                                <Input id="report-slug" required value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="monthly-volunteer-activity" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="report-entity" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data source</label>
                            <select id="report-entity" value={entityType} onChange={(event) => setEntityType(event.target.value as EntityType)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                {entityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="report-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                            <Textarea id="report-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What decision will this report support?" />
                        </div>
                    </CardContent>
                </Card>
                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline"><Link href="/admin/reporting">Cancel</Link></Button>
                    <Button type="submit" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{loading ? "Creating..." : "Create report"}</Button>
                </div>
            </form>
        </div>
    );
}
