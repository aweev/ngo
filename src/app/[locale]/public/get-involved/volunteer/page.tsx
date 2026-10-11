import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VolunteerRole } from "@/types/domain-adapters";

import { VolunteerHero } from "@/components/volunteer/volunteer-hero";
import { VolunteerBenefits } from "@/components/volunteer/volunteer-benefits";
import { RoleFinder } from "@/components/volunteer/role-finder";
import { VolunteerJourney } from "@/components/volunteer/volunteer-journey";
import { getPublicVolunteerRoles } from "@/actions/public";
import { toVolunteerRole } from "@/lib/content/public-mappers";
import { buildPublicMetadata } from "@/lib/seo";

// ISR: role board changes only when staff edit it, purged via
// revalidatePublicVolunteerRoutes().
// NOTE: must stay an inline literal — Next's static segment-config
// analysis cannot resolve imported values (300 = PUBLIC_REVALIDATE_SECONDS).
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Volunteer.Hero" });
    return buildPublicMetadata({
        locale,
        path: '/public/get-involved/volunteer',
        title: t("headline"),
        description: t("subheadline"),
        ogImage: undefined,
        publishedTime: undefined,
        modifiedTime: undefined,
        authors: undefined,
        section: 'Volunteer',
        tags: ['volunteer', 'volunteering', 'opportunities', 'join', 'nonprofit'],
    });
}

/**
 * Open roles from the `public_volunteer_roles` view (status = 'open' for the
 * public site's designated organization). Returns an empty board rather than
 * placeholder data when nothing is published, so the page never shows fake
 * opportunities.
 */
async function getOpenRoles(): Promise<VolunteerRole[]> {
    const { data } = await getPublicVolunteerRoles();
    return (data ?? []).map(toVolunteerRole);
}

export default async function VolunteerPage({ params }: { params: Promise<{ locale: string }> }) {
    await params;
    const roles = await getOpenRoles();

    return (
        <main className="pt-20">
            <VolunteerHero />
            <VolunteerBenefits />
            <RoleFinder roles={roles} />
            <VolunteerJourney />
        </main>
    );
}