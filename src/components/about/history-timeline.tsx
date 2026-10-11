"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export type TimelineMilestone = { year: string; title: string; description: string };

export function HistoryTimeline({ milestones }: { milestones?: TimelineMilestone[] } = {}) {
    const t = useTranslations("About.Timeline");
    const locale = useLocale();
    const isRTL = locale === 'ar';

    // Admin-driven milestones (content category `milestone`); i18n years only when DB is empty.
    const items: TimelineMilestone[] = milestones && milestones.length > 0
        ? milestones
        : ["2018", "2020", "2022", "2024"].map((year) => ({
            year,
            title: t(`milestones.${year}.title`),
            description: t(`milestones.${year}.desc`),
        }));

    // ERROR FIX: default to the latest milestone instead of hardcoded "2024".
    const [activeYear, setActiveYear] = useState<string | null>(items[items.length - 1]?.year ?? null);

    const years = items.map((m) => m.year);
    const byYear = new Map(items.map((m) => [m.year, m]));

    return (
        <section className="py-24 bg-muted/10">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-serif font-bold text-foreground">{t("title")}</h2>
                </div>

                <div className="relative">
                    {/* Vertical Line - centered, works for both LTR and RTL */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-border -translate-x-1/2" />

                    <div className="space-y-12">
                        {years.map((year, index) => {
                            const isActive = activeYear === year;
                            const isEven = index % 2 === 0;

                            return (
                                <div key={year} className="relative flex flex-col md:flex-row items-center">

                                    {/* Node - centered, works for both LTR and RTL */}
                                    <button
                                        onClick={() => setActiveYear(isActive ? null : year)}
                                        className={cn(
                                            "absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 z-10 transition-all duration-300 flex items-center justify-center",
                                            isActive
                                                ? "bg-white border-primary scale-125 shadow-lg shadow-primary/20"
                                                : "bg-background border-muted-foreground hover:border-primary"
                                        )}
                                            aria-label={`${isActive ? "Collapse" : "Expand"} ${year}: ${byYear.get(year)?.title ?? ""}`}
                                            aria-expanded={isActive}
                                    >
                                        <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-primary" : "bg-transparent")} />
                                    </button>

                                    {/* Content Wrapper - RTL aware */}
                                    <div className={cn(
                                        "w-full md:w-1/2 pl-12 md:pl-0",
                                        isRTL
                                            ? (isEven ? "md:ml-auto md:pl-12" : "md:pr-12 md:text-right")
                                            : (isEven ? "md:pr-12 md:text-right" : "md:ml-auto md:pl-12")
                                    )}>
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            whileInView={{ opacity: 1, y: 0 }}
                                            viewport={{ once: true }}
                                            className={cn(
                                                "bg-background p-6 rounded-2xl border border-border/60 shadow-sm cursor-pointer hover:shadow-md transition-all",
                                                isActive && "border-primary/50 ring-1 ring-primary/20"
                                            )}
                                            onClick={() => setActiveYear(isActive ? null : year)}
                                        >
                                            <div className={cn(
                                                "flex items-center gap-4 mb-2",
                                                isRTL
                                                    ? (isEven ? "md:flex-row-reverse" : "flex-row")
                                                    : (isEven ? "flex-row" : "md:flex-row-reverse")
                                            )}>
                                                <span className="text-2xl font-bold text-primary font-serif">{year}</span>
                                                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isActive && "rotate-180")} />
                                            </div>

                                            <h3 className="text-lg font-bold text-foreground mb-1">{byYear.get(year)?.title}</h3>

                                            <AnimatePresence>
                                                {isActive && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <p className="text-muted-foreground pt-2 text-sm leading-relaxed">
                                                            {byYear.get(year)?.description}
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}