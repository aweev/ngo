import { getWorkers } from "@/actions/workers";
import { WorkersTable } from "@/components/manage/workers-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function AdminWorkersPage() {
    const { data, error } = await getWorkers();

    return (
        <div>
            <PageHeader title="Workers" description="Manage all staff across your organization." />
            {error && <p className="mb-4 text-sm text-red-500">Failed to load workers: {error}</p>}
            <WorkersTable workers={data ?? []} />
        </div>
    );
}