import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PathCard } from "@/components/get-involved/path-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import { Mail } from "lucide-react";
import { buildPublicMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "GetInvolved.Hub" });
    return buildPublicMetadata({
        locale,
        path: '/public/get-involved',
        title: t("title"),
        description: t("subtitle"),
        ogImage: undefined,
        publishedTime: undefined,
        modifiedTime: undefined,
        authors: undefined,
        section: 'Get Involved',
        tags: ['volunteer', 'donate', 'partnership', 'get involved', 'support'],
    });
}

export default async function GetInvolvedPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "GetInvolved.Hub" });

    return (
        <main className="min-h-screen bg-background pt-24 pb-24 transition-colors duration-300">
            <div className="container mx-auto px-4">

                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-20 space-y-6">
                    <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-[1.1]">
                        {t("title")}
                    </h1>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                        {t("subtitle")}
                    </p>
                </div>

                {/* The 3 Gateways */}
                <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
                    <PathCard
                        title={t("Cards.donate_title")}
                        description={t("Cards.donate_desc")}
                        impact={t("Cards.donate_impact")}
                        cta={t("Cards.donate_cta")}
                        href="/public/get-involved/donate"
                        iconKey="Heart"
                        theme="primary"
                        delay={0.1}
                    />

                    <PathCard
                        title={t("Cards.volunteer_title")}
                        description={t("Cards.volunteer_desc")}
                        impact={t("Cards.volunteer_impact")}
                        cta={t("Cards.volunteer_cta")}
                        href="/public/get-involved/volunteer"
                        iconKey="HandHeart"
                        theme="blue"
                        delay={0.2}
                    />

                    <PathCard
                        title={t("Cards.corporate_title")}
                        description={t("Cards.corporate_desc")}
                        impact={t("Cards.corporate_impact")}
                        cta={t("Cards.corporate_cta")}
                        href="/public/get-involved/corporate"
                        iconKey="Briefcase"
                        theme="slate"
                        delay={0.3}
                    />
                </div>

                {/* Fallback / Contact */}
                <div className="mt-24 text-center">
                    <div className="inline-flex flex-col items-center p-8 rounded-3xl bg-muted/30 dark:bg-card border border-border shadow-sm">
                        <h3 className="text-lg font-bold mb-2 text-foreground">{t("Questions.title")}</h3>
                        <p className="text-muted-foreground mb-6 max-w-md">
                            {t("Questions.text")}
                        </p>
                        <Button asChild variant="outline" className="rounded-full px-8 bg-background hover:bg-muted">
                            <Link href="/public/contact">
                                <Mail className="w-4 h-4 mr-2" />
                                {t("Questions.cta")}
                            </Link>
                        </Button>
                    </div>
                </div>

            </div>
        </main>
    );
}