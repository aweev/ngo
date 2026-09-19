import { getDonors } from "@/actions/donors";
import { DonorsTable } from "@/components/manage/donors-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function DashboardDonorsPage() {
    const { data, error } = await getDonors();

    return (
        <div>
            <PageHeader title="Donors" description="Manage your donors and their contributions." />
            {error && <p className="mb-4 text-sm text-red-500">Failed to load donors: {error}</p>}
            <DonorsTable donors={data ?? []} />
        </div>
    );
}