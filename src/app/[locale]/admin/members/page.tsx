import { PageHeader } from "@/components/manage/page-header";
import { getInvitations, getMembers } from "@/actions/members";
import { TeamManager } from "@/components/admin/team-manager";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Team & Invites",
    description: "Manage organization members, roles, and invitations.",
};

export default async function AdminMembersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const [{ data: members, error: membersError }, { data: invitations, error: invitesError }] = await Promise.all([
        getMembers(),
        getInvitations(locale),
    ]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Team & Invites"
                description="Who has access, what they can do, and who is still waiting on an invitation."
            />
            <TeamManager
                locale={locale}
                initialMembers={members}
                initialInvitations={invitations}
                loadError={membersError || invitesError}
            />
        </div>
    );
}
