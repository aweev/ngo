import { getCampaigns } from "@/actions/campaigns";
import { CampaignsTable } from "@/components/manage/campaigns-table";
import { PageHeader } from "@/components/manage/page-header";

export const dynamic = "force-dynamic";

export default async function DashboardCampaignsPage() {
    const { data, error } = await getCampaigns();

    return (
        <div>
            <PageHeader title="Campaigns" description="Manage your fundraising campaigns." />
            {error && <p className="mb-4 text-sm text-red-500">Failed to load campaigns: {error}</p>}
            <CampaignsTable campaigns={data ?? []} />
        </div>
    );
}