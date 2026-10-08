import { getCampaigns } from "@/actions/campaigns";
import { CampaignsTable } from "@/components/manage/campaigns-table";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function DashboardCampaignsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Dashboard.Campaigns" });
    const { data, error } = await getCampaigns();

    return (
        <div>
            <PageHeader title={t("title")} description={t("desc")} />
            {error && <p className="mb-4 text-sm text-red-500">{t("load_failed", { error })}</p>}
            <CampaignsTable campaigns={data ?? []} />
        </div>
    );
}