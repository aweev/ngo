"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { staggeredContainer, dignifiedReveal } from "@/lib/animations";

export interface PartnerLogo {
    id: string;
    name: string;
    logo: string;
    website?: string;
}

interface PartnerGridProps {
    title: string;
    description: string;
    partners: PartnerLogo[];
    tier: "tier1" | "tier2" | "tier3";
}

export function PartnerGrid({ title, description, partners, tier }: PartnerGridProps) {
    // Config based on Tier
    const gridConfig = {
        tier1: "grid-cols-1 md:grid-cols-3 gap-8 md:gap-12",
        tier2: "grid-cols-2 md:grid-cols-4 gap-6 md:gap-8",
        tier3: "grid-cols-2 md:grid-cols-5 gap-4 md:gap-6",
    };

    const logoHeight = {
        tier1: "h-24 md:h-32",
        tier2: "h-16 md:h-20",
        tier3: "h-12 md:h-16",
    };

    const cardStyle = {
        tier1: "p-8 md:p-12 border-2",
        tier2: "p-6 border",
        tier3: "p-4 border",
    };

    return (
        <section className="py-16">
            <div className="container mx-auto px-4">
                <div className="mb-12">
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-2">{title}</h2>
                    <p className="text-muted-foreground max-w-2xl">{description}</p>
                </div>

                <motion.div
                    variants={staggeredContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className={cn("grid", gridConfig[tier])}
                >
                    {partners.map((p) => {
                        const className = cn(
                            "group relative flex items-center justify-center bg-card rounded-xl border-border/60 hover:border-primary/30 hover:shadow-lg transition-all duration-300",
                            cardStyle[tier]
                        );
                        const content = (
                            <>
                                {p.website && <ExternalLink aria-hidden="true" className="absolute top-3 right-3 w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                                <div className={cn("relative w-full grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500", logoHeight[tier])}>
                                    <Image src={p.logo} alt={p.name} fill className="object-contain" sizes="(max-width: 768px) 50vw, 33vw" />
                                </div>
                            </>
                        );
                        return p.website ? (
                            <motion.a key={p.id} href={p.website} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} (opens in a new window)`} variants={dignifiedReveal} className={className}>
                                {content}
                            </motion.a>
                        ) : (
                            <motion.div key={p.id} variants={dignifiedReveal} className={className}>
                                {content}
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>
        </section>
    );
}