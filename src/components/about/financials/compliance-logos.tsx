"use client";

import { useTranslations } from "next-intl";

export function ComplianceLogos() {
    const t = useTranslations("Financials.Compliance");

    return (
        <section className="py-20 border-t border-border">
            <div className="container mx-auto px-4 text-center">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-12">
                    {t("title")}
                </h3>

                <p className="mt-12 text-sm text-muted-foreground max-w-xl mx-auto">
                    {t("subtitle")}
                </p>
            </div>
        </section>
    );
}