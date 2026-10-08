import { getTranslations } from "next-intl/server";
import { getDonors } from "@/actions/donors";
import { DonorsTable } from "@/components/manage/donors-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function AdminDonorsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Donors" });
    const tList = await getTranslations({ locale, namespace: "Admin.List" });
    const { data, error } = await getDonors();

    return (
        <div>
            <PageHeader title={t("title")} description={t("description")} />
            {error && <p className="mb-4 text-sm text-red-500">{tList("load_failed", { entity: t("title"), error })}</p>}
            <DonorsTable donors={data ?? []} />
        </div>
    );
}