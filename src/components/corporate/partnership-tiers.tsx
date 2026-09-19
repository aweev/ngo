"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PartnershipTiers() {
    const t = useTranslations("Corporate.Tiers");

    const tiers = [
        {
            key: "silver",
            color: "border-border",
            header: "bg-muted text-foreground",
            features: ["feature_logo", "feature_report"]
        },
        {
            key: "gold",
            // Keep specific border color for gold, but ensure shadow adapts
            color: "border-amber-400 shadow-xl dark:shadow-amber-900/20 scale-105 z-10",
            header: "bg-gradient-to-br from-amber-400 to-amber-600 text-white",
            features: ["feature_logo", "feature_report", "feature_social", "feature_volunteering"]
        },
        {
            key: "platinum",
            color: "border-border",
            // Inverts based on theme: Dark in light mode, Light in dark mode
            header: "bg-foreground text-background",
            features: ["feature_logo", "feature_report", "feature_social", "feature_volunteering", "feature_advisory", "feature_custom"]
        }
    ];

    const scrollToForm = () => {
        document.getElementById("inquiry-form")?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <section className="py-24 bg-muted/20 transition-colors duration-300">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-serif font-bold text-foreground mb-4">{t("title")}</h2>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 items-start max-w-6xl mx-auto">
                    {tiers.map((tier) => (
                        <div
                            key={tier.key}
                            className={cn(
                                "bg-card rounded-xl overflow-hidden border flex flex-col transition-colors",
                                tier.color
                            )}
                        >
                            <div className={`p-8 text-center ${tier.header}`}>
                                <h3 className="text-xl font-bold mb-2">{t(`${tier.key}_title`)}</h3>
                                <p className="opacity-90 font-medium">{t(`${tier.key}_price`)}</p>
                            </div>

                            <div className="p-8 flex-grow">
                                <ul className="space-y-4">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                                            <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${tier.key === 'gold' ? 'text-amber-500' : 'text-muted-foreground/50'}`} />
                                            {t(feature)}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-8 pt-0 mt-auto">
                                <Button
                                    className="w-full"
                                    variant={tier.key === 'gold' ? 'default' : 'outline'}
                                    onClick={scrollToForm}
                                >
                                    {t("inquire")}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}