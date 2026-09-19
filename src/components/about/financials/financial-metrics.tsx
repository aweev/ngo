"use client";

import { motion } from "framer-motion";
import { useTranslations, useFormatter } from "next-intl";
import { TrendingUp, Scale, Landmark } from "lucide-react";
import { FinancialSummary } from "@/types/domain-adapters";
import { dignifiedReveal, staggeredContainer } from "@/lib/animations";

export function FinancialMetrics({ data }: { data: FinancialSummary }) {
    const t = useTranslations("Financials.Metrics");
    const format = useFormatter();

    const metrics = [
        {
            key: "revenue",
            value: format.number(data.totalRevenue, { style: 'currency', currency: 'EUR', notation: 'compact' }),
            icon: TrendingUp,
            color: "text-brand-radiant-gold"
        },
        {
            key: "efficiency",
            value: format.number(data.efficiencyRatio, { style: 'percent', maximumFractionDigits: 0 }),
            sub: t("efficiency_desc"),
            icon: Scale,
            color: "text-brand-hopeful-clay"
        },
        {
            key: "budget",
            value: format.number(data.totalBudget, { style: 'currency', currency: 'EUR', notation: 'compact' }),
            icon: Landmark,
            color: "text-blue-500"
        }
    ];

    return (
        <section className="py-16 -mt-8 relative z-10">
            <div className="container mx-auto px-4">
                <motion.div
                    variants={staggeredContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-3 gap-6"
                >
                    {metrics.map((m) => (
                        <motion.div
                            key={m.key}
                            variants={dignifiedReveal}
                            className="bg-card p-8 rounded-2xl border border-border/50 shadow-xl shadow-black/5"
                        >
                            <div className={`w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center mb-6 ${m.color}`}>
                                <m.icon className="w-6 h-6" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-2">
                                {t(m.key)}
                            </p>
                            <p className="text-4xl font-serif font-bold text-foreground">
                                {m.value}
                            </p>
                            {m.sub && (
                                <p className="text-sm text-muted-foreground mt-1">{m.sub}</p>
                            )}
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}