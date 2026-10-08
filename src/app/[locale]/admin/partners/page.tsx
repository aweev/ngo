import { getTranslations } from "next-intl/server";
import { getPartners } from "@/actions/partners";
import { PartnersTable } from "@/components/manage/partners-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Partners" });
    const tList = await getTranslations({ locale, namespace: "Admin.List" });
    const { data, error } = await getPartners();

    return (
        <div>
            <PageHeader title={t("title")} description={t("description")} />
            {error && <p className="mb-4 text-sm text-red-500">{tList("load_failed", { entity: t("title"), error })}</p>}
            <PartnersTable partners={data ?? []} />
        </div>
    );
}