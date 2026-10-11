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
import {
    getPublicFinancialSummary,
    getPublicDocuments,
    getPublicTestimonials,
} from "@/actions/public";
import { buildPublicMetadata } from "@/lib/seo";

/**
 * Transparency figures come from the database, never from a literal.
 *
 * This page previously rendered a hardcoded `efficiencyRatio: 0.85` and an
 * 85/10/5 expense split inside a section headed "Transparency", on the page
 * where a visitor enters card details. That is a fabricated accounting claim.
 * The financials page already gates the same chart behind `hasFinancialData`;
 * the donate page now follows that rule and shows nothing until an admin has
 * entered real figures.
 */
async function getTransparency(locale: string): Promise<FinancialSummary | null> {
    const [{ data: summary }, { data: docs }] = await Promise.all([
        getPublicFinancialSummary(),
        getPublicDocuments(1, locale),
    ]);

    if (!summary) return null;

    const financials: FinancialSummary = {
        year: docs?.[0]?.year ?? new Date().getFullYear(),
        totalRevenue: summary.totalRevenue ?? 0,
        totalBudget: summary.totalBudget ?? 0,
        efficiencyRatio: summary.efficiencyRatio ?? 0,
        expenses: {
            program: summary.programExpenses ?? 0,
            management: summary.managementExpenses ?? 0,
            fundraising: summary.fundraisingExpenses ?? 0,
        },
    };

    const hasData =
        financials.totalRevenue > 0 ||
        financials.totalBudget > 0 ||
        financials.expenses.program > 0;

    return hasData ? financials : null;
}

/**
 * A real, published CMS testimonial - or none.
 *
 * The hero used to overlay a stock photograph labelled "Beneficiary Portrait"
 * with a translated caption and an attributed name, which invents a person.
 * Field content is only shown when an editor has published it.
 */
type RealTestimonial = { text: string; author: string; location: string; imageSrc: string };

async function getFeaturedTestimonial(locale: string): Promise<RealTestimonial | null> {
    const { data } = await getPublicTestimonials(1, locale);
    const page = data?.[0];
    if (!page) return null;

    const c = (page.content ?? {}) as Record<string, unknown>;
    const str = (k: string) => (typeof c[k] === "string" ? (c[k] as string) : "");

    const text = str("quote") || str("text") || page.meta_description || "";
    const author = str("author") || str("name") || page.title;

    if (!text.trim() || !author.trim()) return null;

    return {
        text: text.trim(),
        author: author.trim(),
        location: str("location") || str("role"),
        imageSrc: str("image_src") || page.cover_image_url || "",
    };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Donation.Page" });
    return buildPublicMetadata({
        locale,
        path: '/public/get-involved/donate',
        title: t("title"),
        description: t("description"),
        ogImage: undefined,
        publishedTime: undefined,
        modifiedTime: undefined,
        authors: undefined,
        section: 'Donate',
        tags: ['donate', 'donation', 'support', 'charity', 'nonprofit'],
    });
}

export const revalidate = 300;

export default async function DonatePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Donation.Page" });
    const [financialData, testimonial] = await Promise.all([
        getTransparency(locale),
        getFeaturedTestimonial(locale),
    ]);

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

                            {testimonial ? (
                                <figure className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-2xl border border-border/60">
                                    {testimonial.imageSrc ? (
                                        <Image
                                            src={testimonial.imageSrc}
                                            alt=""
                                            fill
                                            className="object-cover"
                                            priority
                                        />
                                    ) : (
                                        <div className="h-full w-full bg-linear-to-br from-primary/10 via-transparent to-accent/10" />
                                    )}
                                    <figcaption className="absolute bottom-0 left-0 right-0 p-8 bg-linear-to-t from-black/80 to-transparent text-white">
                                        <blockquote className="text-2xl font-serif italic mb-2">
                                            &quot;{testimonial.text}&quot;
                                        </blockquote>
                                        <p className="text-sm font-bold uppercase tracking-wider opacity-80">
                                            {testimonial.author}
                                            {testimonial.location ? `, ${testimonial.location}` : ""}
                                        </p>
                                    </figcaption>
                                </figure>
                            ) : null}

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

                        {/* 3. Transparency - real admin figures only, hidden until they exist. */}
                        {financialData && (
                            <div className="bg-muted/30 rounded-[2.5rem] p-8 md:p-12 border border-border">
                                <h2 className="text-3xl font-serif font-bold mb-4">{t("transparency_title")}</h2>
                                <p className="text-muted-foreground mb-8 text-lg">{t("transparency_desc")}</p>
                                <DonationJourney data={financialData} />
                            </div>
                        )}

                        {/* 4. FAQ */}
                        <div>
                            <h2 className="text-3xl font-serif font-bold mb-8">{t("faq_title")}</h2>
                            <DonationFAQ />
                        </div>

                        {/* 5. Matching Gift Banner */}
                        <div className="bg-brand-radiant-gold/10 border border-brand-radiant-gold/20 p-8 rounded-3xl flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                            <div className="grow">
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