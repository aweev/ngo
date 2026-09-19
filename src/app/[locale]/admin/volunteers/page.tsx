import { getVolunteers } from "@/actions/volunteers";
import { VolunteersTable } from "@/components/manage/volunteers-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function AdminVolunteersPage() {
    const { data, error } = await getVolunteers();

    return (
        <div>
            <PageHeader title="Volunteers" description="Manage all volunteers and their status." />
            {error && <p className="mb-4 text-sm text-red-500">Failed to load volunteers: {error}</p>}
            <VolunteersTable volunteers={data ?? []} />
        </div>
    );
}