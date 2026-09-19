import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TeamMemberViewModel } from "@/types/domain-adapters";

import { CultureHero } from "@/components/about/team/culture-hero";
import { LeadershipGrid } from "@/components/about/team/leadership-grid";
import { BoardGrid } from "@/components/about/team/board-grid";
import { StaffFilter } from "@/components/about/team/staff-filter";
import { AdvisoryAndCTA } from "@/components/about/team/advisory-cta";
import { getPublicTeamMembers } from "@/actions/public";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Team.Hero" });
    return {
        title: t("title"),
        description: t("subtitle")
    };
}

export default async function TeamPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    // Admin command center: content_pages with content.category = 'team_member'.
    // Sections hide automatically when the DB has no rows (no mock profiles).
    const { data } = await getPublicTeamMembers(50, locale);

    const team: TeamMemberViewModel[] = (data ?? [])
        .filter((m) => m.name.trim().length > 0)
        .map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role,
            category: m.category,
            imageSrc: m.imageSrc,
            bio: m.bio,
            ...(m.affiliation ? { affiliation: m.affiliation } : {}),
            ...(m.linkedin ? { linkedin: m.linkedin } : {}),
            ...(m.department ? { department: m.department } : {}),
        }));

    // Image grids require a valid src — filter to avoid next/image errors.
    const withImage = (list: TeamMemberViewModel[]) => list.filter((m) => m.imageSrc.trim().length > 0);

    // Categorize for Layouts
    const leadership = withImage(team.filter(m => m.category === 'Leadership'));
    const board = withImage(team.filter(m => m.category === 'Board'));
    const staff = withImage(team.filter(m => m.category === 'Staff'));
    const advisors = team.filter(m => m.category === 'Advisory');

    return (
        <main className="pt-20">
            <CultureHero />
            <LeadershipGrid leaders={leadership} />
            <BoardGrid members={board} />
            <StaffFilter staff={staff} />
            <AdvisoryAndCTA advisors={advisors} />
        </main>
    );
}
