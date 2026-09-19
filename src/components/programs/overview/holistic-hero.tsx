"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { dignifiedReveal } from "@/lib/animations";

export function HolisticHero() {
    const t = useTranslations("Programs.Overview.Hero");

    const scrollToPillars = () => {
        const element = document.getElementById("pillars-grid");
        element?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <section className="relative h-[90vh] min-h-[600px] w-full overflow-hidden flex items-center justify-center">
            {/* 1. Cinematic Background */}
            <div className="absolute inset-0 z-0">
                {/* Placeholder for Video - Using high-res image for now */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2000&auto=format&fit=crop')" }}
                />

                {/* 2. Cinematic Overlay (Dark Gradient for Readability) */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

                {/* Texture Overlay */}
                <div className="absolute inset-0 bg-texture-paper opacity-20 mix-blend-overlay" />
            </div>

            {/* 3. Content */}
            <div className="relative z-10 container mx-auto px-4 text-center text-white">
                <motion.div
                    variants={dignifiedReveal}
                    initial="hidden"
                    animate="visible"
                    className="max-w-4xl mx-auto space-y-8"
                >
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold tracking-tight leading-[1.1]">
                        {t("headline")}
                    </h1>
                    <p className="text-xl md:text-2xl text-white/90 font-light leading-relaxed max-w-2xl mx-auto">
                        {t("subheadline")}
                    </p>
                </motion.div>
            </div>

            {/* 4. Interaction (Scroll Anchor) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-12 left-1/2 -translate-x-1/2 cursor-pointer group"
                onClick={scrollToPillars}
            >
                <div className="flex flex-col items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80 group-hover:text-white transition-colors">
                        {t("scroll_cta")}
                    </span>
                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center bg-white/5 backdrop-blur-sm group-hover:bg-white/10 transition-all">
                        <ChevronDown className="w-5 h-5 text-white animate-bounce" />
                    </div>
                </div>
            </motion.div>
        </section>
    );
}