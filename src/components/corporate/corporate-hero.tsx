"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { dignifiedReveal } from "@/lib/animations";

export function CorporateHero() {
    const t = useTranslations("Corporate.Hero");

    const scrollToForm = () => {
        document.getElementById("inquiry-form")?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <section className="relative h-[70vh] min-h-[500px] flex items-center bg-slate-900 overflow-hidden">
            {/* Background Image: Corporate Volunteering */}
            <div
                className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=2000')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent" />

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    variants={dignifiedReveal}
                    initial="hidden"
                    animate="visible"
                    className="max-w-2xl space-y-6"
                >
                    <div className="inline-block px-3 py-1 rounded bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-widest">
                        B2B Partnerships
                    </div>
                    <h1 className="text-5xl md:text-6xl font-serif font-bold text-white leading-tight">
                        {t("headline")}
                    </h1>
                    <p className="text-xl text-slate-300 leading-relaxed">
                        {t("subheadline")}
                    </p>
                    <div className="pt-4">
                        <Button
                            size="lg"
                            className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-8 h-14 rounded-none" // Squared corners for corporate feel
                            onClick={scrollToForm}
                        >
                            {t("cta")}
                            <ArrowDown className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}