"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
    ArrowRight,
    Play,
    ChevronDown,
    Globe,
    Users,
    TrendingUp,
    ShieldCheck,
    Award,
    Sparkles,
    Heart
} from "lucide-react";
import { heroAnimations } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { Link } from "@/lib/navigation";
import { HeroViewModel, TestimonialViewModel, ImpactMetricViewModel } from "@/types/domain-adapters";

interface HeroSectionProps {
    content: HeroViewModel;
    testimonials: TestimonialViewModel[];
    metrics: [ImpactMetricViewModel, ImpactMetricViewModel, ImpactMetricViewModel];
    locale?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
    content,
    testimonials,
    metrics,
}) => {
    const t = useTranslations("Hero.Floating"); // Hook for UI labels
    const [currentTestimonial, setCurrentTestimonial] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoaded(true), 100);
        if (testimonials.length > 1) {
            const interval = setInterval(() => {
                setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
            }, 6000);
            return () => {
                clearTimeout(timer);
                clearInterval(interval);
            };
        }
        return () => clearTimeout(timer);
    }, [testimonials.length]);

    const statConfig = [
        { icon: Users, color: "text-brand-hopeful-clay" },
        { icon: TrendingUp, color: "text-brand-radiant-gold" },
        { icon: Globe, color: "text-blue-500" },
    ];

    const handleScrollToNext = () => {
        const nextSection = document.getElementById("impact-section");
        if (nextSection) nextSection.scrollIntoView({ behavior: "smooth" });
    };

    // NOTE: section top padding must always clear the fixed public header
    // (~80-88px). lg:py-0 used to strip it on desktop, sliding the centered
    // content underneath the nav.
    return (
        <section className="relative w-full min-h-[100dvh] flex flex-col justify-center bg-background overflow-hidden pt-28 pb-12 lg:pt-36 lg:pb-20">
            {/* Background Textures */}
            <div className="absolute inset-0 pointer-events-none select-none">
                <div className="absolute inset-0 bg-texture-paper opacity-40 z-0 mix-blend-multiply dark:mix-blend-screen" />

                {/* Animated Orbs */}
                <motion.div
                    className="absolute top-[-10%] left-[-10%] w-[300px] lg:w-[500px] h-[300px] lg:h-[500px] bg-primary/20 rounded-full blur-[80px] lg:blur-[100px]"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute bottom-[-10%] right-[-10%] w-[250px] lg:w-[400px] h-[250px] lg:h-[400px] bg-accent/20 rounded-full blur-[80px] lg:blur-[100px]"
                    animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.6, 0.4] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                />
            </div>

            <div className="relative z-10 w-full max-w-7xl px-4 mx-auto md:px-8 lg:px-12 flex-grow flex flex-col justify-center">
                <motion.div
                    variants={heroAnimations.container}
                    initial="hidden"
                    animate={isLoaded ? "visible" : "hidden"}
                    className="flex flex-col lg:grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"
                >
                    {/* --- LEFT COLUMN: TEXT --- */}
                    <div className="space-y-6 lg:space-y-8 text-center lg:text-left w-full">
                        <motion.div variants={heroAnimations.headline} className="space-y-3 lg:space-y-4">
                            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-serif font-bold tracking-tight text-foreground leading-[1.1]">
                                <span className="block">{content.headlinePrimary}</span>
                                <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-x">
                                    {content.headlineAccent}
                                </span>
                            </h1>
                        </motion.div>

                        <motion.p variants={heroAnimations.headline} className="text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                            {content.subheadline}
                        </motion.p>

                        {/* Testimonials */}
                        {testimonials.length > 0 && (
                            <motion.div
                                variants={heroAnimations.floatingCard}
                                className="bg-card/80 backdrop-blur-md rounded-xl p-4 border border-border/50 shadow-sm max-w-md mx-auto lg:mx-0 text-left"
                            >
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentTestimonial}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.3 }}
                                        className="flex items-start gap-3"
                                    >
                                        <div className="w-10 h-10 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center flex-shrink-0">
                                            <Heart className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-foreground font-medium italic text-sm mb-1 line-clamp-3">
                                                &quot;{testimonials[currentTestimonial]?.text}&quot;
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                — {testimonials[currentTestimonial]?.author}, {testimonials[currentTestimonial]?.location}
                                            </p>
                                        </div>
                                    </motion.div>
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* CTA Buttons */}
                        <motion.div variants={heroAnimations.cta} className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start w-full sm:w-auto">
                            <Button asChild size="lg" className="w-full sm:w-auto rounded-full px-8 py-6 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all group">
                                <Link href={content.primaryCtaLink}>
                                    {content.primaryCta}
                                    <ArrowRight className="w-4 h-4 ml-2 rtl:rotate-180 transition-transform group-hover:translate-x-1" />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 py-6 text-base font-semibold hover:bg-card/80 transition-all">
                                <Link href="/public/about">
                                    <Play className="w-4 h-4 mr-2 rtl:rotate-180" />
                                    {content.secondaryCta}
                                </Link>
                            </Button>
                        </motion.div>

                        {/* Trust Badges */}
                        <motion.div variants={heroAnimations.cta} className="flex flex-wrap gap-4 justify-center lg:justify-start pt-2 text-xs sm:text-sm font-medium text-muted-foreground">
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-card/60 backdrop-blur-sm rounded-lg border border-border/40">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                                <span>{content.trustText1}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-card/60 backdrop-blur-sm rounded-lg border border-border/40">
                                <Award className="w-4 h-4 text-accent" />
                                <span>{content.trustText2}</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* --- RIGHT COLUMN: VISUAL --- */}
                    <motion.div
                        variants={heroAnimations.floatingCard}
                        className="relative w-full aspect-square lg:aspect-auto lg:h-[clamp(420px,62dvh,600px)] lg:w-full mt-8 lg:mt-0"
                    >
                        {/* Main Image Container */}
                        <div className="absolute inset-2 lg:inset-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-border/50 group">

                            {content.imageSrc ? (
                                <>
                                    <Image
                                        src={content.imageSrc}
                                        alt={content.imageAlt}
                                        fill
                                        className="object-cover transition-transform duration-1000 group-hover:scale-105"
                                        priority
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                    />
                                    <div className="absolute inset-0 bg-texture-paper opacity-20 mix-blend-multiply" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 space-y-4">
                                    <div className="relative">
                                        <Users className="w-16 h-16 lg:w-24 lg:h-24 opacity-20" />
                                        <motion.div
                                            className="absolute inset-0 w-16 h-16 lg:w-24 lg:h-24 border-4 border-accent/30 rounded-full"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                        />
                                    </div>
                                    <p className="font-serif text-xl lg:text-2xl opacity-40">{content.imageAlt}</p>
                                </div>
                            )}

                            {/* Stats Overlay (Glassmorphism) */}
                            <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md p-4 lg:p-6 border-t border-border/50">
                                <div className="flex justify-around items-center">
                                    {metrics.map((stat, i) => {
                                        const config = statConfig[i] || statConfig[0];
                                        return (
                                            <div key={i} className="text-center">
                                                <config.icon className={cn("w-4 h-4 lg:w-5 lg:h-5 mx-auto mb-1", config.color)} />
                                                <div className="font-bold text-base lg:text-lg leading-none">{stat.value}</div>
                                                <div className="text-[9px] lg:text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                                                    {stat.label}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Floating Card 1 (Active Projects) */}
                        <motion.div
                            animate={{ y: [-10, 10, -10] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-8 -right-2 lg:-right-6 bg-card/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-border/50 flex items-center gap-3 z-20 hidden sm:flex"
                        >
                            <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-xs lg:text-sm">{t("active_label")}</div>
                                <div className="text-[10px] lg:text-xs text-muted-foreground">{t("active_desc")}</div>
                            </div>
                        </motion.div>

                        {/* Floating Card 2 (Global Impact) */}
                        <motion.div
                            animate={{ y: [-10, 10, -10] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute -bottom-4 -left-2 lg:-left-6 bg-card/95 backdrop-blur-md p-3 rounded-xl shadow-xl border border-border/50 z-20 hidden sm:block"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-lg">
                                    <Globe className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="font-bold text-xs lg:text-sm">{t("global_label")}</div>
                                    <div className="text-[10px] lg:text-xs text-muted-foreground">{t("global_desc")}</div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 1 }}
                    className="hidden lg:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2 cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                    onClick={handleScrollToNext}
                >
                    <span className="text-xs font-medium uppercase tracking-widest">{content.scrollText}</span>
                    <ChevronDown className="w-5 h-5 animate-bounce" />
                </motion.div>
            </div>

            {/* Gradient Animation Keyframes */}
            <style jsx>{`
                @keyframes gradient-x {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-x {
                    animation: gradient-x 3s ease infinite;
                }
            `}</style>
        </section>
    );
};