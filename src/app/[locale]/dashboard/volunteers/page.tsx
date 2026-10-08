import { getVolunteers } from "@/actions/volunteers";
import { VolunteersTable } from "@/components/manage/volunteers-table";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function DashboardVolunteersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Dashboard.Volunteers" });
    const { data, error } = await getVolunteers();

    return (
        <div>
            <PageHeader title={t("title")} description={t("desc")} />
            {error && <p className="mb-4 text-sm text-red-500">{t("load_failed", { error })}</p>}
            <VolunteersTable volunteers={data ?? []} />
        </div>
    );
}