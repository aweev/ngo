"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { dignifiedReveal } from "@/lib/animations";
import { ProgramCategory, PROGRAM_THEMES } from "@/lib/program-themes";
import { programsPath } from "@/lib/program-routes";

interface CategoryHeroProps {
    category: ProgramCategory;
    title: string;
    lead: string;
    imageSrc: string;
}

export function CategoryHero({ category, title, lead, imageSrc }: CategoryHeroProps) {
    const t = useTranslations("Programs.Category.breadcrumbs");
    const theme = PROGRAM_THEMES[category];

    return (
        <section className="relative pt-32 pb-20 overflow-hidden bg-background">
            <div className="container mx-auto px-4">
                {/* Breadcrumbs */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground mb-8"
                >
                    <Link href="/" className="hover:text-primary transition-colors">{t("home")}</Link>
                    <ChevronRight className="w-4 h-4" />
                    <Link href={programsPath()} className="hover:text-primary transition-colors">{t("programs")}</Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className={`font-medium ${theme.primary} capitalize`}>
                        {category.replace('-', ' ')}
                    </span>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Text Content */}
                    <motion.div
                        variants={dignifiedReveal}
                        initial="hidden"
                        animate="visible"
                        className="relative z-10"
                    >
                        {/* Dynamic Blob */}
                        <div className={`absolute -left-20 -top-20 w-64 h-64 rounded-full bg-gradient-to-br ${theme.gradient} blur-3xl opacity-50 pointer-events-none`} />

                        <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6 leading-[1.1]">
                            {title}
                        </h1>
                        <p className="text-xl text-muted-foreground leading-relaxed border-l-4 pl-6 border-border">
                            {lead}
                        </p>
                    </motion.div>

                    {/* Hero Image */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl"
                    >
                        <Image
                            src={imageSrc}
                            alt={title}
                            fill
                            className="object-cover"
                            priority
                            sizes="(max-width: 768px) 100vw, 50vw"
                        />
                        {/* Color Tint based on Theme */}
                        <div className={`absolute inset-0 bg-gradient-to-tr ${theme.gradient} mix-blend-multiply opacity-30`} />
                        <div className="absolute inset-0 bg-texture-paper opacity-10 mix-blend-multiply" />
                    </motion.div>
                </div>
            </div>
        </section>
    );
}