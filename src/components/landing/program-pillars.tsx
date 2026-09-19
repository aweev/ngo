"use client";

import { motion, Variants } from "framer-motion";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import {
    Briefcase,
    GraduationCap,
    HeartPulse,
    Users2,
    ArrowUpRight,
    LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { programCategoryPath } from "@/lib/program-routes";
import type { ProgramCategory } from "@/lib/program-themes";

// --- Types ---

interface Pillar {
    id: string;
    route: ProgramCategory;
    icon: LucideIcon;
    color: string;
    gradient: string;
}

// --- Animation Variants (Typed to fix TS errors) ---

const cardVariants: Variants = {
    rest: { scale: 1 },
    hover: {
        scale: 0.98,
        transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
    }
};

const imageVariants: Variants = {
    rest: { scale: 1.1, filter: "grayscale(20%)" },
    hover: {
        scale: 1.25,
        filter: "grayscale(0%)",
        transition: { duration: 0.8, ease: "easeOut" }
    }
};

const contentVariants: Variants = {
    rest: { y: 0 },
    hover: {
        y: -10,
        transition: { duration: 0.4, ease: "easeOut" }
    }
};

const descriptionVariants: Variants = {
    rest: { opacity: 0, height: 0, marginTop: 0 },
    hover: {
        opacity: 1,
        height: "auto",
        marginTop: 12,
        transition: { duration: 0.4, ease: "easeOut" }
    }
};

const iconVariants: Variants = {
    rest: { scale: 1, rotate: 0 },
    hover: {
        scale: 1.1,
        rotate: -5,
        transition: { type: "spring", stiffness: 300 }
    }
};

export function ProgramPillars({ projectCounts, totalProjects }: {
    projectCounts?: Record<string, number>;
    totalProjects?: number;
} = {}) {
    const t = useTranslations("Programs.Pillars");

    const pillars: Pillar[] = [
        {
            id: "economic",
            route: "economic-empowerment",
            icon: Briefcase,
            color: "text-amber-400",
            gradient: "from-amber-400/20 to-amber-600/20",
        },
        {
            id: "education",
            route: "education",
            icon: GraduationCap,
            color: "text-blue-400",
            gradient: "from-blue-400/20 to-blue-600/20",
        },
        {
            id: "health",
            route: "health",
            icon: HeartPulse,
            color: "text-rose-400",
            gradient: "from-rose-400/20 to-rose-600/20",
        },
        {
            id: "social",
            route: "social-integration",
            icon: Users2,
            color: "text-emerald-400",
            gradient: "from-emerald-400/20 to-emerald-600/20",
        }
    ];

    return (
        <section className="py-24 lg:py-32 bg-background relative">
            {/* Section Header */}
            <div className="container mx-auto px-4 md:px-6 mb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-2xl"
                >
                    <span className="text-primary font-bold tracking-widest uppercase text-sm pl-4 border-l-2 border-primary mb-4 block">
                        {t("subtitle")}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-[1.1]">
                        {t("title")}
                    </h2>
                </motion.div>
            </div>

            {/* The Grid */}
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 h-auto lg:h-[800px]">
                    {pillars.map((pillar) => (
                        <Link
                            key={pillar.id}
                            href={programCategoryPath(pillar.route)}
                            className="block h-[400px] lg:h-auto w-full"
                        >
                            <motion.div
                                className="relative w-full h-full rounded-[2rem] overflow-hidden cursor-pointer group isolation-auto"
                                initial="rest"
                                whileHover="hover"
                                whileTap="rest"
                                variants={cardVariants}
                            >
                                {/* Image Layer */}
                                <motion.div
                                    className="absolute inset-0 z-0"
                                    variants={imageVariants}
                                >
                                    <div className={cn("h-full w-full bg-gradient-to-br", pillar.gradient)} aria-hidden="true" />
                                    <div className="absolute inset-0 bg-texture-paper opacity-30 mix-blend-multiply" />
                                </motion.div>

                                {/* Gradient & Glow Layers */}
                                <div className={cn(
                                    "absolute inset-0 z-10 transition-opacity duration-500 opacity-60 group-hover:opacity-80 bg-gradient-to-t from-black via-black/40 to-transparent"
                                )} />
                                <div className={cn(
                                    "absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 mix-blend-overlay bg-gradient-to-tr",
                                    pillar.gradient
                                )} />

                                {/* Content */}
                                <div className="absolute inset-0 z-20 p-8 lg:p-12 flex flex-col justify-end">
                                    <motion.div variants={contentVariants}>
                                        <div className="flex items-center justify-between mb-4">
                                            <motion.div
                                                variants={iconVariants}
                                                className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl"
                                            >
                                                <pillar.icon className={cn("w-8 h-8", pillar.color)} />
                                            </motion.div>
                                            <motion.div
                                                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                                            >
                                                <ArrowUpRight className="w-5 h-5" />
                                            </motion.div>
                                        </div>

                                        <h3 className="text-3xl font-serif font-bold text-white leading-tight">
                                            {t(`${pillar.id}.title`)}
                                        </h3>

                                        {/* Live count from the admin command center (/admin/projects) */}
                                        {projectCounts && (projectCounts[pillar.id] ?? 0) > 0 && (
                                            <span className="inline-flex w-fit items-center mt-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur border border-white/20 text-white text-xs font-bold">
                                                {projectCounts[pillar.id]} active
                                            </span>
                                        )}

                                        <motion.div variants={descriptionVariants} className="overflow-hidden">
                                            <p className="text-gray-200 text-base leading-relaxed max-w-md">
                                                {t(`${pillar.id}.description`)}
                                            </p>
                                            <span className={cn(
                                                "inline-block mt-4 text-sm font-bold uppercase tracking-wider",
                                                pillar.color
                                            )}>
                                                {t("learn_more")}
                                            </span>
                                        </motion.div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}