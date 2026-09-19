import { getWorkers } from "@/actions/workers";
import { WorkersTable } from "@/components/manage/workers-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function DashboardWorkersPage() {
    const { data, error } = await getWorkers();

    return (
        <div>
            <PageHeader title="Workers" description="Manage your staff and team members." />
            {error && <p className="mb-4 text-sm text-red-500">Failed to load workers: {error}</p>}
            <WorkersTable workers={data ?? []} />
        </div>
    );
}