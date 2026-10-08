import { getTranslations } from "next-intl/server";
import { getWorkers } from "@/actions/workers";
import { WorkersTable } from "@/components/manage/workers-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function AdminWorkersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Workers" });
    const tList = await getTranslations({ locale, namespace: "Admin.List" });
    const { data, error } = await getWorkers();

    return (
        <div>
            <PageHeader title={t("title")} description={t("description")} />
            {error && <p className="mb-4 text-sm text-red-500">{tList("load_failed", { entity: t("title"), error })}</p>}
            <WorkersTable workers={data ?? []} />
        </div>
    );
}