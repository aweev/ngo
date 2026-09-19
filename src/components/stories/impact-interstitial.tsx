"use client";

import { useTranslations, useFormatter } from "next-intl";
import { TrendingUp } from "lucide-react";

export function ImpactInterstitial({ totalLives }: { totalLives: number }) {
    const t = useTranslations("Stories.Grid");
    const format = useFormatter();

    return (
        <div className="my-16 py-8 border-y border-border/50 bg-brand-radiant-gold/5 flex items-center justify-center text-center">
            <div className="container px-4">
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-brand-radiant-gold-darker">
                    <TrendingUp className="w-6 h-6" />
                    <p className="text-lg md:text-xl font-serif font-medium">
                        {t.rich("impact_interstitial", {
                            count: format.number(totalLives),
                            span: (chunks) => <span className="font-bold text-2xl mx-1">{chunks}</span>
                        })}
                    </p>
                </div>
            </div>
        </div>
    );
}