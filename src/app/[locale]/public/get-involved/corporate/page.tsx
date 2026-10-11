import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CaseStudyViewModel } from "@/types/domain-adapters";

import { CorporateHero } from "@/components/corporate/corporate-hero";
import { BusinessCase } from "@/components/corporate/business-case";
import { PartnershipTiers } from "@/components/corporate/partnership-tiers";
import { CaseStudySlider } from "@/components/corporate/case-study-slider";
import { InquiryForm } from "@/components/corporate/inquiry-form";
import { buildPublicMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Corporate.Hero" });
    return buildPublicMetadata({
        locale,
        path: '/public/get-involved/corporate',
        title: t("headline"),
        description: t("subheadline"),
        ogImage: undefined,
        publishedTime: undefined,
        modifiedTime: undefined,
        authors: undefined,
        section: 'Corporate Partnerships',
        tags: ['corporate', 'partnership', 'csr', 'business', 'sponsorship'],
    });
}

const caseStudies: CaseStudyViewModel[] = [
    {
        id: "1",
        companyName: "TechForward",
        logoSrc: "https://cdn.logoipsum.com/logoipsum-256.svg",
        quote: "Partnering with AWE transformed our team culture. Seeing the direct impact of our scholarship fund inspired everyone.",
        author: "Marcus Chen",
        role: "CEO",
        outcomeStats: "Funded 50 Scholars"
    },
    {
        id: "2",
        companyName: "GreenEnergy",
        logoSrc: "https://cdn.logoipsum.com/logoipsum-262.svg",
        quote: "The transparency and professionalism of the AWE team made the reporting process effortless for our stakeholders.",
        author: "Sarah Miller",
        role: "CSR Director",
        outcomeStats: "Built 3 Solar Clinics"
    }
];

export default async function CorporatePage({ params }: { params: Promise<{ locale: string }> }) {
    await params;

    return (
        <main className="pt-20">
            <CorporateHero />
            <BusinessCase />
            <PartnershipTiers />
            <CaseStudySlider studies={caseStudies} />
            <InquiryForm />
        </main>
    );
}