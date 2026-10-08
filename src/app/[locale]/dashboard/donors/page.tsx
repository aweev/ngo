import { getDonors } from "@/actions/donors";
import { DonorsTable } from "@/components/manage/donors-table";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function DashboardDonorsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Dashboard.Donors" });
    const { data, error } = await getDonors();

    return (
        <div>
            <PageHeader title={t("title")} description={t("desc")} />
            {error && <p className="mb-4 text-sm text-red-500">{t("load_failed", { error })}</p>}
            <DonorsTable donors={data ?? []} />
        </div>
    );
}