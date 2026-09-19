"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, HeartHandshake } from "lucide-react";
import { TeamMemberViewModel } from "@/types/domain-adapters";

interface AdvisoryProps {
    advisors: TeamMemberViewModel[];
}

export function AdvisoryAndCTA({ advisors }: AdvisoryProps) {
    const t = useTranslations("Team");

    return (
        <div className="bg-muted/30">
            {/* Advisory Council - Only render if data exists */}
            {advisors && advisors.length > 0 && (
                <section className="py-20 border-b border-border/50">
                    <div className="container mx-auto px-4 max-w-4xl text-center">
                        <h2 className="text-2xl font-serif font-bold mb-2">{t("Advisory.title")}</h2>
                        <p className="text-muted-foreground mb-8 text-sm">{t("Advisory.subtitle")}</p>

                        <div className="flex flex-wrap justify-center gap-8 md:gap-16">
                            {advisors.map((advisor) => (
                                <div key={advisor.id} className="text-center">
                                    <p className="font-bold text-foreground">{advisor.name}</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{advisor.role}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Career CTA */}
            <section className="py-24">
                <div className="container mx-auto px-4 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-radiant-gold/10 rounded-full mb-6">
                        <HeartHandshake className="w-8 h-8 text-brand-radiant-gold" />
                    </div>
                    <h2 className="text-4xl font-serif font-bold text-foreground mb-8">
                        {t("Careers.title")}
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button asChild size="lg" className="rounded-full px-8">
                            <Link href="/public/get-involved/volunteer">
                                {t("Careers.button_volunteer")}
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="rounded-full px-8">
                            <Link href="/public/contact">
                                {t("Careers.button_jobs")}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}