import { getTranslations } from "next-intl/server";
import { getCampaigns } from "@/actions/campaigns";
import { CampaignsTable } from "@/components/manage/campaigns-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Campaigns" });
    const tList = await getTranslations({ locale, namespace: "Admin.List" });
    const { data, error } = await getCampaigns();

    return (
        <div>
            <PageHeader title={t("title")} description={t("description")} />
            {error && <p className="mb-4 text-sm text-red-500">{tList("load_failed", { entity: t("title"), error })}</p>}
            <CampaignsTable campaigns={data ?? []} />
        </div>
    );
}