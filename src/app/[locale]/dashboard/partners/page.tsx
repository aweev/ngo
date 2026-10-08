import { getPartners } from "@/actions/partners";
import { PartnersTable } from "@/components/manage/partners-table";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function DashboardPartnersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Dashboard.Partners" });
    const { data, error } = await getPartners();

    return (
        <div>
            <PageHeader title={t("title")} description={t("desc")} />
            {error && <p className="mb-4 text-sm text-red-500">{t("load_failed", { error })}</p>}
            <PartnersTable partners={data ?? []} />
        </div>
    );
}