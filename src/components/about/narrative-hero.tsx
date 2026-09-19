"use client";

import { motion } from "framer-motion";
import { dignifiedReveal } from "@/lib/animations";
import { useTranslations } from "next-intl";

export function NarrativeHero({ content }: {
    content?: { preheader: string; headline: string; lead: string; images: string[] };
} = {}) {
    const t = useTranslations("About.Hero");

    const preheader = content?.preheader || t("preheader");
    const headline = content?.headline || t("headline");
    const lead = content?.lead || t("lead");
    const images = content?.images && content.images.length >= 2 ? content.images.slice(0, 2) : [];

    return (
        <section className="min-h-[60vh] flex flex-col lg:flex-row bg-canvas-white overflow-hidden">
            {/* Left: Text */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-20 relative z-10">
                <motion.div
                    variants={dignifiedReveal}
                    initial="hidden"
                    animate="visible"
                    className="max-w-xl space-y-6"
                >
                    <span className="text-primary font-bold tracking-widest uppercase text-sm pl-4 border-l-2 border-primary">
                        {preheader}
                    </span>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-[1.1]">
                        {headline}
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                        {lead}
                    </p>
                </motion.div>
            </div>

            {/* Right: Collage */}
            <div className="w-full lg:w-1/2 relative min-h-[400px] lg:min-h-auto bg-muted/20">
                {images.length >= 2 ? <div className="absolute inset-0 grid grid-cols-2 gap-4 p-8 opacity-90 transform rotate-2 scale-105">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="relative h-full w-full rounded-2xl overflow-hidden shadow-xl mt-12"
                    >
                        <img src={images[0]} alt="Community gathering" className="h-full w-full object-cover" />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.4 }}
                        className="relative h-full w-full rounded-2xl overflow-hidden shadow-xl mb-12"
                    >
                        <img src={images[1]} alt="Workshop session" className="h-full w-full object-cover" />
                    </motion.div>
                </div> : <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/.25),transparent_45%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]">
                    <div className="max-w-sm px-8 text-center">
                        <div className="mx-auto mb-5 h-20 w-20 rounded-full border border-primary/30 bg-primary/10" aria-hidden="true" />
                        <p className="font-serif text-2xl font-bold text-foreground">{t("image_alt")}</p>
                    </div>
                </div>}
                {/* Soft Edge Overlay */}
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-canvas-white lg:to-canvas-white/90" />
            </div>
        </section>
    );
}