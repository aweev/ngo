import { getTranslations } from "next-intl/server";
import { getVolunteers } from "@/actions/volunteers";
import { VolunteersTable } from "@/components/manage/volunteers-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function AdminVolunteersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Volunteers" });
    const tList = await getTranslations({ locale, namespace: "Admin.List" });
    const { data, error } = await getVolunteers();

    return (
        <div>
            <PageHeader title={t("title")} description={t("description")} />
            {error && <p className="mb-4 text-sm text-red-500">{tList("load_failed", { entity: t("title"), error })}</p>}
            <VolunteersTable volunteers={data ?? []} />
        </div>
    );
}