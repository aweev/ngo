"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

export function KeyTakeaways({ points }: { points: string[] }) {
    const t = useTranslations("News.Article");

    if (!points || points.length === 0) return null;

    return (
        <div className="my-10 p-8 bg-muted/30 rounded-2xl border border-border/60">
            <h3 className="font-serif font-bold text-xl mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-brand-radiant-gold rounded-full" />
                {t("takeaways")}
            </h3>
            <ul className="space-y-3">
                {points.map((point, i) => (
                    <li key={i} className="flex items-start gap-3 text-foreground/90">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="leading-relaxed">{point}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}