import { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { DonationWidget } from "@/components/donation/donation-widget";
import { DonationFAQ } from "@/components/donation/faq-accordion";
import { ImpactSlider } from "@/components/donation/impact-slider";
// Code-split: recharts only loads for the transparency section.
const DonationJourney = dynamic(
    () => import("@/components/about/financials/donation-journey").then((m) => m.DonationJourney),
    { loading: () => <div className="py-16" aria-hidden="true" /> },
);
import { ShieldCheck, Award } from "lucide-react";
import { FinancialSummary } from "@/types/domain-adapters";

// Define Mock financial data ensuring type safety
const financialData: FinancialSummary = {
    year: 2024,
    totalRevenue: 0,
    totalBudget: 0,
    efficiencyRatio: 0.85,
    expenses: { program: 85, management: 10, fundraising: 5 }
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Donation.Page" });
    return {
        title: t("title"),
        description: t("description")
    };
}

export default async function DonatePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Donation.Page" });

    return (
        <main className="bg-background min-h-screen pt-28 pb-24">

            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-20 items-start">

                    {/* LEFT COLUMN: Emotional Story & Trust (7 Cols) */}
                    <div className="lg:col-span-7 space-y-16">

                        {/* 1. Hero Content */}
                        <div className="space-y-8">
                            <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-[1.1]">
                                {t("hero_headline")}
                            </h1>
                            <p className="text-xl text-muted-foreground leading-relaxed">
                                {t("hero_subheadline")}
                            </p>

                            <div className="relative aspect-[16/9] rounded-[2.5rem] overflow-hidden shadow-2xl">
                                <Image
                                    src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1600"
                                    alt="Beneficiary Portrait"
                                    fill
                                    className="object-cover"
                                    priority
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent text-white">
                                    <p className="text-2xl font-serif italic mb-2">&quot;{t("quote")}&quot;</p>
                                    <p className="text-sm font-bold uppercase tracking-wider opacity-80">— {t("quote_author")}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-4 pt-4">
                                <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-full text-sm font-bold text-green-700">
                                    <ShieldCheck className="w-4 h-4" />
                                    {t("secure_badge")}
                                </div>
                                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-full text-sm font-bold text-amber-700">
                                    <Award className="w-4 h-4" />
                                    {t("tax_badge")}
                                </div>
                            </div>
                        </div>

                        {/* 2. Impact Calculator */}
                        <ImpactSlider />

                        {/* 3. Transparency */}
                        <div className="bg-muted/30 rounded-[2.5rem] p-8 md:p-12 border border-border">
                            <h2 className="text-3xl font-serif font-bold mb-4">{t("transparency_title")}</h2>
                            <p className="text-muted-foreground mb-8 text-lg">{t("transparency_desc")}</p>
                            <DonationJourney data={financialData} />
                        </div>

                        {/* 4. FAQ */}
                        <div>
                            <h2 className="text-3xl font-serif font-bold mb-8">{t("faq_title")}</h2>
                            <DonationFAQ />
                        </div>

                        {/* 5. Matching Gift Banner */}
                        <div className="bg-brand-radiant-gold/10 border border-brand-radiant-gold/20 p-8 rounded-3xl flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                            <div className="flex-grow">
                                <h3 className="text-xl font-bold mb-2">{t("matching_title")}</h3>
                                <p className="text-muted-foreground text-sm">{t("matching_desc")}</p>
                            </div>
                            <div className="w-full md:w-auto">
                                <div className="bg-background border border-border h-12 px-4 rounded-xl flex items-center text-muted-foreground text-sm w-full md:w-72 shadow-inner">
                                    {t("matching_placeholder")}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Sticky Donation Widget (5 Cols) */}
                    <div className="lg:col-span-5 relative">
                        <div className="sticky top-28">
                            <DonationWidget />
                        </div>
                    </div>

                </div>
            </div>
        </main>
    );
}