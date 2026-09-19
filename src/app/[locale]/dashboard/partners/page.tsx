import { getPartners } from "@/actions/partners";
import { PartnersTable } from "@/components/manage/partners-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function DashboardPartnersPage() {
    const { data, error } = await getPartners();

    return (
        <div>
            <PageHeader title="Partners" description="Manage your partner organizations and collaborations." />
            {error && <p className="mb-4 text-sm text-red-500">Failed to load partners: {error}</p>}
            <PartnersTable partners={data ?? []} />
        </div>
    );
}