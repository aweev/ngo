import { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import { FinancialSummary, FinancialDocument } from "@/types/domain-adapters";

import { TrustHero } from "@/components/about/financials/trust-hero";
// Code-split: recharts only loads when real financial data exists.
const DonationJourney = dynamic(
    () => import("@/components/about/financials/donation-journey").then((m) => m.DonationJourney),
    { loading: () => <div className="py-16" aria-hidden="true" /> },
);
import { FinancialMetrics } from "@/components/about/financials/financial-metrics";
import { DocumentRepository } from "@/components/about/financials/document-repository";
import { ComplianceLogos } from "@/components/about/financials/compliance-logos";
import { getPublicDocuments, getPublicFinancialSummary } from "@/actions/public";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Financials.Hero" });
    return {
        title: t("title"),
        description: t("subtitle")
    };
}

export default async function FinancialsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;

    // Admin command center: aggregate totals via public_financial_summary()
    // + transparency docs via content_pages (category = 'document').
    const [{ data: summary }, { data: docs }] = await Promise.all([
        getPublicFinancialSummary(),
        getPublicDocuments(30, locale),
    ]);

    const financials: FinancialSummary = {
        year: docs?.[0]?.year ?? new Date().getFullYear(),
        totalRevenue: summary?.totalRevenue ?? 0,
        totalBudget: summary?.totalBudget ?? 0,
        efficiencyRatio: summary?.efficiencyRatio ?? 0,
        expenses: {
            program: summary?.programExpenses ?? 0,
            management: summary?.managementExpenses ?? 0,
            fundraising: summary?.fundraisingExpenses ?? 0,
        },
    };

    const documents: FinancialDocument[] = (docs ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        year: d.year,
        category: d.category,
        url: d.url,
        size: d.size,
    }));

    const hasFinancialData =
        financials.totalRevenue > 0 ||
        financials.totalBudget > 0 ||
        financials.expenses.program > 0;

    return (
        <main className="pt-20">
            <TrustHero />
            {/* Real admin totals only — hidden until /admin/financial has data. */}
            {hasFinancialData && (
                <>
                    <FinancialMetrics data={financials} />
                    <DonationJourney data={financials} />
                </>
            )}
            {/* Real admin documents only — hidden until docs exist. */}
            {documents.length > 0 && <DocumentRepository documents={documents} />}
            <ComplianceLogos />
        </main>
    );
}
