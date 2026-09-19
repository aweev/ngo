"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { dignifiedReveal } from "@/lib/animations";

export function TrustHero() {
    const t = useTranslations("Financials.Hero");

    return (
        <section className="py-24 md:py-32 bg-background relative overflow-hidden">
            {/* Subtle Background Stamp Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none">
                <ShieldCheck className="w-[500px] h-[500px] text-primary" />
            </div>

            <div className="container mx-auto px-4 text-center relative z-10">
                <motion.div
                    variants={dignifiedReveal}
                    initial="hidden"
                    animate="visible"
                    className="max-w-3xl mx-auto space-y-6"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
                        <ShieldCheck className="w-3 h-3" />
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