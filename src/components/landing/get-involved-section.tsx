"use client";

import { motion, useInView } from "framer-motion";
import { useState, useRef, useMemo } from "react";
import { Link } from "@/lib/navigation";
import { InvolvementOption } from "@/types/domain-adapters";
import { dignifiedReveal, staggeredContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { donationPath } from "@/lib/program-routes";
import { useTranslations, useFormatter } from "next-intl";
import {
    ArrowRight,
    Heart,
    Users,
    Briefcase,
    HandHeart,
    Sparkles,
    CheckCircle,
    LucideIcon
} from "lucide-react";

interface GetInvolvedSectionProps {
    options: InvolvementOption[];
    title: string;
    locale?: string;
}

// Map strings to Icons
const ICON_MAP: Record<string, LucideIcon> = {
    heart: Heart,
    users: Users,
    briefcase: Briefcase,
    "hand-heart": HandHeart,
};

// --- Background Decoration ---
const BackgroundElement = ({
    delay, color, size, position
}: { delay: number; color: string; size: string; position: { x: string; y: string } }) => (
    <motion.div
        className={`absolute ${color} ${size} opacity-20 rounded-full blur-xl`}
        style={{ left: position.x, top: position.y }}
        animate={{
            y: [-20, 20, -20],
            scale: [0.8, 1.2, 0.8],
            opacity: [0.1, 0.3, 0.1]
        }}
        transition={{
            duration: 8 + delay,
            repeat: Infinity,
            delay,
            ease: "easeInOut",
        }}
    />
);

// --- Donation Widget ---
const QuickDonateWidget = ({ }: { locale: string }) => {
    const t = useTranslations("Involved.Widgets");
    const format = useFormatter();
    const [amount, setAmount] = useState(50);

    const formatCurrency = (val: number) =>
        format.number(val, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

    return (
        <div className="mt-6 p-4 bg-background/50 rounded-xl border border-primary/10">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t("quick_give_label")}
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3">
                {[25, 50, 100].map((val) => (
                    <button
                        key={val}
                        onClick={(e) => { e.preventDefault(); setAmount(val); }}
                        className={cn(
                            "py-2.5 px-1 rounded-lg text-sm font-bold transition-all border touch-manipulation",
                            amount === val
                                ? "bg-primary text-white border-primary shadow-md"
                                : "bg-white border-border text-muted-foreground hover:border-primary/50"
                        )}
                    >
                        {formatCurrency(val)}
                    </button>
                ))}
            </div>
            <Link
                href={donationPath({ amount })}
                className="block w-full py-3.5 bg-gradient-to-r from-primary to-primary/90 text-white text-center font-bold rounded-lg shadow-lg hover:shadow-primary/25 transition-all active:scale-[0.98]"
            >
                {t("donate_button", { amount: formatCurrency(amount) })}
            </Link>
        </div>
    );
};

// --- The Card ---
const InvolvementCard = ({
    option,
    index,
    isHovered,
    onHover,
    locale
}: {
    option: InvolvementOption;
    index: number;
    isHovered: boolean;
    onHover: (index: number | null) => void;
    locale: string;
}) => {
    const t = useTranslations("Involved.Widgets");
    const IconComponent = ICON_MAP[option.icon] || Heart;

    // Distinct styling for personas
    const styles = useMemo(() => [
        { // Donor (Primary Brand)
            gradient: "from-brand-hopeful-clay/10 to-transparent",
            border: "hover:border-brand-hopeful-clay/30",
            iconBg: "bg-brand-hopeful-clay text-white",
            text: "text-brand-hopeful-clay",
            glow: "shadow-brand-hopeful-clay/10"
        },
        { // Volunteer (Secondary/Teal)
            gradient: "from-teal-500/10 to-transparent",
            border: "hover:border-teal-500/30",
            iconBg: "bg-teal-600 text-white",
            text: "text-teal-600",
            glow: "shadow-teal-500/10"
        },
        { // Partner (Accent/Gold)
            gradient: "from-brand-radiant-gold/10 to-transparent",
            border: "hover:border-brand-radiant-gold/30",
            iconBg: "bg-brand-radiant-gold text-white",
            text: "text-yellow-700",
            glow: "shadow-brand-radiant-gold/10"
        }
    ], []);

    const style = styles[index % styles.length];
    const isDonor = option.icon === "heart";

    return (
        <motion.div
            className="group relative h-full"
            onHoverStart={() => onHover(index)}
            onHoverEnd={() => onHover(null)}
            whileHover={{ y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            <div className={cn(
                "relative h-full overflow-hidden rounded-[2rem] transition-all duration-500",
                "bg-card/40 backdrop-blur-md border border-border/50",
                style.border,
                isHovered ? `shadow-2xl ${style.glow}` : "shadow-lg"
            )}>
                {/* Background Gradient */}
                <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                    style.gradient
                )} />

                {/* Texture */}
                <div className="absolute inset-0 bg-texture-paper opacity-20 mix-blend-multiply" />

                <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110", style.iconBg)}>
                            <IconComponent className="w-6 h-6 md:w-7 md:h-7" />
                        </div>
                        {/* Subtle Arrow */}
                        <div className="p-2 rounded-full border border-border/50 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className={cn("w-4 h-4", style.text)} />
                        </div>
                    </div>

                    <h3 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-3">{option.title}</h3>

                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed flex-grow">
                        {option.description}
                    </p>

                    {/* Dynamic Content Area */}
                    <div className="mt-8">
                        {isDonor ? (
                            <QuickDonateWidget locale={locale} />
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-2 items-center text-sm text-muted-foreground">
                                    <CheckCircle className={cn("w-4 h-4", style.text)} />
                                    <span>{t("impact_note")}</span>
                                </div>
                                <Link href={option.link}>
                                    <div className={cn(
                                        "w-full py-3.5 rounded-xl font-bold text-center transition-all border border-border/50 bg-background/50 hover:bg-white group-hover:shadow-md flex items-center justify-center gap-2",
                                        style.text
                                    )}>
                                        {option.cta}
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export function GetInvolvedSection({ options, title, locale = 'en' }: GetInvolvedSectionProps) {
    const t = useTranslations("Involved");
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);
    const sectionRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(sectionRef, { once: true, amount: 0.1 }); // Reduced amount for better mobile trigger

    return (
        <section ref={sectionRef} className="relative py-16 lg:py-32 overflow-hidden bg-muted/10">
            {/* Background Decor */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <BackgroundElement delay={0} color="bg-primary" size="w-64 h-64 md:w-96 md:h-96" position={{ x: "-10%", y: "-10%" }} />
                <BackgroundElement delay={2} color="bg-accent" size="w-48 h-48 md:w-64 md:h-64" position={{ x: "90%", y: "40%" }} />
            </div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <motion.div
                    variants={staggeredContainer}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="text-center max-w-3xl mx-auto mb-12 md:mb-20 space-y-4 md:space-y-6"
                >
                    <motion.div variants={dignifiedReveal}>
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
                            <HandHeart className="w-3 h-3" />
                            {t("badge")}
                        </span>
                    </motion.div>

                    <motion.h2
                        variants={dignifiedReveal}
                        className="text-3xl md:text-5xl font-serif font-bold text-foreground leading-[1.1]"
                    >
                        {title}
                    </motion.h2>
                </motion.div>

                <motion.div
                    variants={staggeredContainer}
                    initial="hidden"
                    animate={isInView ? "visible" : "hidden"}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
                >
                    {options.map((option, index) => (
                        <motion.div key={index} variants={dignifiedReveal} className="h-full">
                            <InvolvementCard
                                option={option}
                                index={index}
                                isHovered={hoveredCard === index}
                                onHover={setHoveredCard}
                                locale={locale}
                            />
                        </motion.div>
                    ))}
                </motion.div>

                {/* Bottom Sparkle CTA */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    className="mt-12 md:mt-16 text-center"
                >
                    <div className="inline-flex flex-wrap justify-center items-center gap-2 text-muted-foreground text-sm bg-background/50 backdrop-blur px-4 py-2 rounded-full border border-border/50 shadow-sm">
                        <Sparkles className="w-4 h-4 text-accent hidden sm:block" />
                        <span>
                            {t("footer_question")}{" "}
                            <Link
                                href="/public/contact"
                                className="text-foreground font-semibold underline decoration-primary decoration-2 underline-offset-4 hover:text-primary transition-colors whitespace-nowrap"
                            >
                                {t("footer_link")}
                            </Link>
                        </span>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}