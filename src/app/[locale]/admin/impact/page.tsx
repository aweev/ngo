import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { getImpactMetrics, getImpactGoals } from "@/actions/impact";
import { ImpactMetricCard } from "@/components/admin/impact-metric-card";
import { Plus } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function ImpactPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Impact" });
    const [{ data: metrics }, { data: goals }] = await Promise.all([
        getImpactMetrics(),
        getImpactGoals(),
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
