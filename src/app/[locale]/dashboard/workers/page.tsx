import { getWorkers } from "@/actions/workers";
import { WorkersTable } from "@/components/manage/workers-table";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function DashboardWorkersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Dashboard.Workers" });
    const { data, error } = await getWorkers();

    return (
        <div>
            <PageHeader title={t("title")} description={t("desc")} />
            {error && <p className="mb-4 text-sm text-red-500">{t("load_failed", { error })}</p>}
            <WorkersTable workers={data ?? []} />
        </div>
    );
}