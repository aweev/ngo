"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";
import { dignifiedReveal } from "@/lib/animations";

export function NetworkHero() {
    const t = useTranslations("Partners.Hero");

    return (
        <section className="relative py-24 md:py-32 bg-background overflow-hidden">
            {/* Abstract Network Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="1.5" className="fill-primary" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>

            <div className="container mx-auto px-4 relative z-10 text-center">
                <motion.div
                    variants={dignifiedReveal}
                    initial="hidden"
                    animate="visible"
                    className="max-w-3xl mx-auto space-y-6"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent-foreground text-xs font-bold uppercase tracking-widest">
                        <Share2 className="w-3 h-3" />
                        {t("badge")}
                    </div>

                    <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-[1.1]">
                        {t("title")}
                    </h1>

                    <p className="text-xl text-muted-foreground font-light leading-relaxed">
                        {t("subtitle")}
                    </p>
                </motion.div>
            </div>
        </section>
    );
}