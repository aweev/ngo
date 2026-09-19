"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Award, FileCheck, Globe, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

export function ImpactTicker() {
    const t = useTranslations("Impact.Ticker");

    const badges = [
        { icon: ShieldCheck, text: t("gdpr") },
        { icon: Award, text: t("guidestar") },
        { icon: FileCheck, text: t("audit") },
        { icon: Globe, text: t("registered") },
        { icon: Lock, text: t("secure") },
    ];

    // Duplicate list 4 times to ensure smooth infinite scroll on large screens
    const infiniteBadges = [...badges, ...badges, ...badges, ...badges];

    return (
        <div
            className="w-full bg-background border-y border-border/40 overflow-hidden py-5 relative z-20"
            role="region"
            aria-label="Accreditations and Trust Badges"
        >
            <div className="flex relative max-w-[100vw]">
                <motion.div
                    className="flex gap-12 md:gap-24 items-center whitespace-nowrap px-4 will-change-transform"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{
                        duration: 40,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                >
                    {infiniteBadges.map((badge, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 text-muted-foreground/90 font-medium text-sm md:text-base group"
                        >
                            <badge.icon className="w-5 h-5 text-primary/80 group-hover:text-primary transition-colors" />
                            <span className="uppercase tracking-widest text-xs md:text-sm group-hover:text-foreground transition-colors">
                                {badge.text}
                            </span>
                        </div>
                    ))}
                </motion.div>

                {/* Gradient Masks for "Fade Out" effect at edges */}
                <div className="absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-background via-background/90 to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-background via-background/90 to-transparent z-10 pointer-events-none" />
            </div>
        </div>
    );
}