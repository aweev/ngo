"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PartnerViewModel } from "@/types/domain-adapters";
import { useMemo } from "react";

interface TrustMarqueeProps {
    partners?: PartnerViewModel[];
}

// --- Professional Fallback Data (removed: homepage shows only real partners) ---
void 0;

export function TrustMarquee({ partners = [] }: TrustMarqueeProps) {
    const t = useTranslations("Trust");

    // Real data only: the admin command center (/admin/partners) is the
    // single source of truth. No fake logos — hide when empty.
    const displayPartners = useMemo(() => partners ?? [], [partners]);

    // Create a seamless loop by duplicating the list. Computed before the
    // early return so hooks keep a stable order across renders.
    const marqueeItems = useMemo(() => {
        if (displayPartners.length === 0) return [];
        const minItems = 12;
        const multiplier = Math.ceil(minItems / displayPartners.length);
        return Array(multiplier).fill(displayPartners).flat();
    }, [displayPartners]);

    if (displayPartners.length === 0) return null;

    return (
        <section className="w-full bg-muted/30 border-t border-border/60 py-12 md:py-16 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-texture-paper mix-blend-multiply pointer-events-none" />

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="text-center mb-10 md:mb-12">
                    <p className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
                        {t("header")}
                    </p>
                </div>

                <div className="relative w-full max-w-[100vw] overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-12 md:w-32 z-20 bg-gradient-to-r from-muted/30 to-transparent pointer-events-none backdrop-blur-[1px]" />
                    <div className="absolute right-0 top-0 bottom-0 w-12 md:w-32 z-20 bg-gradient-to-l from-muted/30 to-transparent pointer-events-none backdrop-blur-[1px]" />

                    <div className="flex overflow-hidden">
                        <motion.div
                            className="flex items-center gap-12 md:gap-24 w-max px-6"
                            animate={{ x: ["0%", "-50%"] }}
                            transition={{
                                duration: 40,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            whileHover={{ animationPlayState: "paused" }}
                        >
                            {[...marqueeItems, ...marqueeItems].map((partner, idx) => (
                                <div
                                    key={`${partner.id}-${idx}`}
                                    className="relative group/logo flex-shrink-0"
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap z-30">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-background/90 backdrop-blur px-2 py-1 rounded-md border border-border/50 shadow-sm">
                                                {partner.type}
                                            </span>
                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-border/50 mt-[-1px]" />
                                        </div>
                                    </div>

                                    {partner.logoSrc ? (
                                        <div className={cn(
                                            "relative h-8 md:h-10 w-auto transition-all duration-500",
                                            "grayscale opacity-50 contrast-75",
                                            "group-hover/logo:grayscale-0 group-hover/logo:opacity-100 group-hover/logo:scale-110 group-hover/logo:contrast-100",
                                            "cursor-pointer"
                                        )}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={partner.logoSrc}
                                                alt={partner.name}
                                                className="h-full w-auto object-contain"
                                                loading="lazy"
                                                style={{
                                                    filter: "brightness(0) saturate(100%) invert(35%) sepia(8%) saturate(107%) hue-rotate(201deg) brightness(93%) contrast(85%)"
                                                }}
                                            />
                                            <div className="absolute inset-0 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={partner.logoSrc}
                                                    alt={partner.name}
                                                    className="h-full w-auto object-contain"
                                                    loading="lazy"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        // No uploaded logo — render a typographic mark
                                        // instead of a placeholder image.
                                        <span className="whitespace-nowrap text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground opacity-60 grayscale transition-all duration-500 group-hover/logo:opacity-100 group-hover/logo:text-foreground cursor-pointer">
                                            {partner.name}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}