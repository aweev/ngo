"use client";

import { useTranslations } from "next-intl";
import { CaseStudyViewModel } from "@/types/domain-adapters";
import Image from "next/image";
import { Quote } from "lucide-react";

export function CaseStudySlider({ studies }: { studies: CaseStudyViewModel[] }) {
    const t = useTranslations("Corporate.CaseStudy");

    return (
        <section className="py-24 bg-background transition-colors duration-300 relative overflow-hidden">
            {/* Optional: Add subtle texture from globals.css for depth */}
            <div className="absolute inset-0 bg-texture-paper opacity-30 pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <h2 className="text-3xl font-serif font-bold text-center mb-16 text-foreground">
                    {t("title")}
                </h2>

                <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                    {studies.map((study) => (
                        <div
                            key={study.id}
                            className="bg-muted/30 dark:bg-card dark:border dark:border-border p-10 rounded-2xl relative group hover:shadow-lg transition-all duration-300"
                        >
                            {/* Decorative Quote Icon */}
                            <Quote className="absolute top-8 right-8 w-12 h-12 text-muted-foreground/20 group-hover:text-primary/20 transition-colors" />

                            {/* Logo Area */}
                            <div className="mb-8 relative h-12 w-32 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500">
                                {/* Note: In a real app, ensure logos work on dark mode (e.g., use an invert filter if needed, or separate dark/light logos) */}
                                <Image
                                    src={study.logoSrc}
                                    alt={study.companyName}
                                    fill
                                    className="object-contain object-left dark:invert dark:opacity-80"
                                />
                            </div>

                            {/* Quote Text */}
                            <p className="text-lg text-foreground italic mb-8 relative z-10 leading-relaxed font-serif">
                                &quot;{study.quote}&quot;
                            </p>

                            {/* Author & Stats Footer */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t border-border pt-6">
                                <div className="text-sm">
                                    <p className="font-bold text-foreground">{study.author}</p>
                                    <p className="text-muted-foreground">{study.role}</p>
                                </div>
                                <div className="sm:ml-auto inline-flex items-center px-3 py-1.5 rounded-md bg-background border border-border text-xs font-bold text-primary shadow-sm">
                                    {study.outcomeStats}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}