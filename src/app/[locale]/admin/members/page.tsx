import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { getInvitations, getMembers } from "@/actions/members";
import { TeamManager } from "@/components/admin/team-manager";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Members" });
    return { title: t("title"), description: t("meta_description") };
}

export default async function AdminMembersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Members" });
    const [{ data: members, error: membersError }, { data: invitations, error: invitesError }] = await Promise.all([
        getMembers(),
        getInvitations(locale),
    ]);

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
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
