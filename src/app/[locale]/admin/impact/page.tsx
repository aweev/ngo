import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { getImpactMetrics } from "@/actions/impact";
import { getFieldReports } from "@/actions/field-reports";
import { ImpactMetricCard } from "@/components/admin/impact-metric-card";
import { FieldReportQueue, type FieldReportRow } from "@/components/admin/field-report-queue";
import { Plus } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function ImpactPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Impact" });
    const [{ data: metrics }, { data: reports }] = await Promise.all([
        getImpactMetrics(),
        getFieldReports(undefined, 50),
    ]);

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/impact/new">
                            <Plus className="h-4 w-4" />
                            {t("add_metric")}
                        </Link>
                    </Button>
                }
            />

            <FieldReportQueue
                initialReports={(reports ?? []) as FieldReportRow[]}
                metrics={(metrics ?? []).map((m) => ({ id: m.id, name: m.name }))}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(!metrics || metrics.length === 0) ? (
                    <div className="col-span-full rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                        {t("empty")}
                    </div>
                ) : (
                    metrics.map((m) => <ImpactMetricCard key={m.id} metric={m} />)
                )}
            </div>
        </div>
    );
}
