"use client";

import { useRef } from "react";
import {
    motion,
    useInView,
    useSpring,
    useTransform
} from "framer-motion";
import {
    TrendingUp,
    Users,
    Target,
    Award,
    HeartHandshake,
    Sprout,
    Globe,
    LucideIcon
} from "lucide-react";
import { ImpactMetricViewModel } from "@/types/domain-adapters";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";

const SPRING_CONFIG = {
    stiffness: 75,
    damping: 25,
    restDelta: 0.001
};

const ICON_MAP: Record<string, LucideIcon> = {
    default: TrendingUp,
    lives: Users,
    projects: Target,
    countries: Globe,
    volunteers: HeartHandshake,
    funds: Sprout,
    success: Award
};

const AnimatedCounter = ({ value, locale }: { value: string; locale: string }) => {
    const numericValue = parseInt(value.replace(/[^0-9]/g, "")) || 0;
    const suffix = value.replace(/[0-9.,]/g, "").trim();
    const springValue = useSpring(0, SPRING_CONFIG);
    const displayValue = useTransform(springValue, (current) => {
        return new Intl.NumberFormat(locale).format(Math.round(current));
    });
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-20%" });

    if (isInView) {
        springValue.set(numericValue);
    }

    return (
        <span ref={ref} className="tabular-nums tracking-tight">
            <span className="sr-only">{numericValue}{suffix}</span>
            <span aria-hidden="true">
                <motion.span>{displayValue}</motion.span>
                {suffix}
            </span>
        </span>
    );
};

const StatCard = ({ stat, index, locale }: { stat: ImpactMetricViewModel; index: number; locale: string }) => {
    const iconKey = stat.iconKey && stat.iconKey in ICON_MAP ? stat.iconKey : 'default';
    const Icon = ICON_MAP[iconKey];

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: 0.7, delay: index * 0.1, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="group h-full"
        >
            <div className="h-full bg-card/40 backdrop-blur-sm rounded-3xl p-8 border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl group-hover:from-primary/20 transition-colors duration-500" />
                <div className="relative z-10 w-14 h-14 mb-6 rounded-2xl bg-background shadow-inner border border-border/50 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
                </div>
                <div className="relative z-10 space-y-3">
                    <div className="text-4xl lg:text-5xl font-bold text-foreground font-serif tracking-tight">
                        <AnimatedCounter value={stat.value} locale={locale} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-foreground/90">{stat.label}</h3>
                        {stat.description && (
                            <p className="text-sm text-muted-foreground leading-relaxed">{stat.description}</p>
                        )}
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700 ease-out origin-left" />
            </div>
        </motion.div>
    );
};

interface ImpactSectionProps {
    stats: ImpactMetricViewModel[];
    locale: string;
}

export const ImpactSection = ({ stats, locale }: ImpactSectionProps) => {
    const t = useTranslations("Impact.Stats");

    return (
        <section className="relative py-24 lg:py-32 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-background" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
            </div>

            {/* FIX: Added mx-auto here */}
            <div className="container mx-auto relative z-10 px-4 md:px-6">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
                    <div className="lg:col-span-4 space-y-8">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest"
                        >
                            <TrendingUp className="w-3 h-3" />
                            <span>{t("track_record")}</span>
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-3xl md:text-5xl font-serif font-bold text-foreground leading-[1.1]"
                        >
                            {t("title")}
                        </motion.h2>

                        <motion.div
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="pt-4 border-t border-border/50"
                        >
                            <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                                {t("audit_note")}
                            </p>
                            <Link
                                href="/public/about/financials"
                                className="text-sm font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1 group"
                            >
                                {t("view_report")}
                                <Award className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </motion.div>
                    </div>

                    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {stats.map((stat, i) => (
                            <StatCard key={i} stat={stat} index={i} locale={locale} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};