"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { ArrowRight, LucideIcon, Heart, HandHeart, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

// Map string keys to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
    Heart: Heart,
    HandHeart: HandHeart,
    Briefcase: Briefcase,
};

interface PathCardProps {
    title: string;
    description: string;
    impact: string;
    cta: string;
    href: string;
    iconKey: string;
    theme: "primary" | "blue" | "slate";
    delay: number;
}

export function PathCard({ title, description, impact, cta, href, iconKey, theme, delay }: PathCardProps) {
    const t = useTranslations("Common");
    const IconComponent = ICON_MAP[iconKey] || Heart;

    // Updated styles for Dark Mode compatibility
    const styles = {
        primary: {
            bg: "bg-brand-hopeful-clay/5 dark:bg-brand-hopeful-clay/10 hover:bg-brand-hopeful-clay/10 dark:hover:bg-brand-hopeful-clay/20",
            border: "border-brand-hopeful-clay/20 hover:border-brand-hopeful-clay",
            iconBg: "bg-brand-hopeful-clay text-white",
            text: "text-brand-hopeful-clay",
            shadow: "hover:shadow-brand-hopeful-clay/20"
        },
        blue: {
            bg: "bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20",
            border: "border-blue-200 dark:border-blue-800 hover:border-blue-500",
            iconBg: "bg-blue-500 text-white",
            text: "text-blue-600 dark:text-blue-400",
            shadow: "hover:shadow-blue-500/20"
        },
        slate: {
            bg: "bg-slate-50 dark:bg-card hover:bg-slate-100 dark:hover:bg-muted",
            border: "border-slate-200 dark:border-border hover:border-slate-800 dark:hover:border-primary",
            iconBg: "bg-slate-800 dark:bg-muted dark:text-foreground text-white",
            text: "text-slate-800 dark:text-foreground",
            shadow: "hover:shadow-slate-800/20 dark:hover:shadow-none"
        }
    };

    const s = styles[theme];

    return (
        <Link href={href} className="block h-full group" aria-label={cta}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay, duration: 0.5 }}
                className={cn(
                    "relative h-full p-8 md:p-10 rounded-[2.5rem] border-2 transition-all duration-500 flex flex-col overflow-hidden",
                    s.bg, s.border, s.shadow, "hover:-translate-y-2 hover:shadow-2xl dark:hover:shadow-none"
                )}
            >
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/50 to-transparent dark:from-white/5 rounded-bl-[100%] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                {/* Icon */}
                <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                    s.iconBg
                )}>
                    <IconComponent className="w-8 h-8" />
                </div>

                {/* Content */}
                <h2 className="text-3xl font-serif font-bold text-foreground mb-4 group-hover:translate-x-1 transition-transform">
                    {title}
                </h2>

                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                    {description}
                </p>

                {/* Impact Reveal */}
                <div className="mt-auto pt-8 border-t border-black/5 dark:border-white/5">
                    <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-2 opacity-70">
                        {/* Ensure "impact": "Impact" exists in Common namespace */}
                        {t("impact")}
                    </p>
                    <p className={cn("font-medium text-lg leading-snug", s.text)}>
                        {impact}
                    </p>
                </div>

                {/* CTA Button visuals */}
                <div className={cn(
                    "absolute bottom-8 right-8 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                    "bg-white dark:bg-background border-transparent shadow-sm group-hover:scale-110",
                    s.text
                )}>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:-rotate-45" />
                </div>
            </motion.div>
        </Link>
    );
}