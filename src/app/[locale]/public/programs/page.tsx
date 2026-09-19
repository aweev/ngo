import { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { getPublicStats } from "@/actions/public";

import { HolisticHero } from "@/components/programs/overview/holistic-hero";
import { PillarsGrid } from "@/components/programs/overview/pillars-grid";
import { TheoryConnectiveStrip } from "@/components/programs/overview/theory-strip";

// Code-split: recharts + framer-motion only load when the proof section renders.
const AggregatedImpact = dynamic(
    () => import("@/components/programs/overview/impact-dashboard").then((m) => m.AggregatedImpact),
    { loading: () => <div className="py-24" aria-hidden="true" /> },
);

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Programs.Overview.Hero" });
    return {
        title: t("headline"),
        description: t("subheadline")
    };
}

// Analytics Service Call
async function getAggregatedData() {
    try {
        const stats = await getPublicStats();

        if (stats && !stats.error) {
            return {
                programsDelivered: stats.totalDonations,
                activeProjects: stats.activeProjects,
                regions: stats.activeCampaigns
            };
        }
    } catch { }

    // Fallback for Dev
    if (process.env.NODE_ENV === 'development') {
        return {
            programsDelivered: 450,
            activeProjects: 32,
            regions: 8
        };
    }

    return { programsDelivered: 0, activeProjects: 0, regions: 0 };
}

export default async function ProgramsOverviewPage({ params }: { params: Promise<{ locale: string }> }) {
    await params; // Next.js 15
    const data = await getAggregatedData();

    return (
        <main>
            {/* 1. Hero: High Impact */}
            <HolisticHero />

            {/* 2. Navigation Hub */}
            <PillarsGrid />

            {/* 3. Logic/Flow */}
            <TheoryConnectiveStrip />

            {/* 4. Proof */}
            <AggregatedImpact data={data} />
        </main>
    );
}