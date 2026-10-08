import { getTranslations } from "next-intl/server";
import { getProjects } from "@/actions/projects";
import { ProjectsTable } from "@/components/manage/projects-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Projects" });
    const tList = await getTranslations({ locale, namespace: "Admin.List" });
    const { data, error } = await getProjects();

    return (
        <div>
            <PageHeader title={t("title")} description={t("description")} />
            {error && <p className="mb-4 text-sm text-red-500">{tList("load_failed", { entity: t("title"), error })}</p>}
            <ProjectsTable projects={data ?? []} />
        </div>
    );
}