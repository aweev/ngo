"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { dignifiedReveal } from "@/lib/animations";

export function CultureHero() {
    const t = useTranslations("Team.Hero");

    return (
        <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_70%_25%,hsl(var(--accent)/.45),transparent_34%),linear-gradient(135deg,hsl(var(--primary)),hsl(var(--foreground)))]">
                <div className="absolute inset-0 opacity-20 bg-[linear-gradient(90deg,transparent_49%,hsl(var(--background)/.5)_50%,transparent_51%),linear-gradient(transparent_49%,hsl(var(--background)/.5)_50%,transparent_51%)] big-size[5rem_5rem]" />
            </div>

            <div className="container mx-auto px-4 relative z-10 text-center text-white">
                <motion.div
                    variants={dignifiedReveal}
                    initial="hidden"
                    animate="visible"
                    className="max-w-3xl mx-auto space-y-6"
                >
                    <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight">
                        {t("title")}
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 font-medium leading-relaxed max-w-2xl mx-auto">
                        {t("subtitle")}
                    </p>
                </motion.div>
            </div>
        </section>
    );
}