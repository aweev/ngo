import { getProjects } from "@/actions/projects";
import { ProjectsTable } from "@/components/manage/projects-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function AdminProjectsPage() {
    const { data, error } = await getProjects();

    return (
        <div>
            <PageHeader title="Projects" description="Manage all projects and programs." />
            {error && <p className="mb-4 text-sm text-red-500">Failed to load projects: {error}</p>}
            <ProjectsTable projects={data ?? []} />
        </div>
    );
}