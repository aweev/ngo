"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
    ChevronLeft,
    ChevronRight,
    Play,
    Quote,
    ArrowRight,
    MapPin
} from "lucide-react";
import { Link } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { SuccessStoryViewModel } from "@/types/domain-adapters";
import { Button } from "../ui/button";

interface SuccessStoriesCarouselProps {
    stories: SuccessStoryViewModel[];
}

// Cinematic transition variants
const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.95
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 1000 : -1000,
        opacity: 0,
        scale: 0.95
    })
};

const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { delay: 0.3, duration: 0.5 }
    }
};

export function SuccessStoriesCarousel({ stories }: SuccessStoriesCarouselProps) {
    const t = useTranslations("Stories.Carousel");
    const [[page, direction], setPage] = useState([0, 0]);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    // Calculate absolute index to handle infinite wrapping
    const index = Math.abs(page % stories.length);
    const story = stories[index];

    const paginate = useCallback((newDirection: number) => {
        setPage([page + newDirection, newDirection]);
    }, [page]);

    // Auto-play logic
    useEffect(() => {
        if (!isAutoPlaying) return;
        const timer = setInterval(() => paginate(1), 8000);
        return () => clearInterval(timer);
    }, [isAutoPlaying, paginate]);

    // If no stories, hide section
    if (!stories || stories.length === 0) return null;

    return (
        <section className="relative py-24 lg:py-32 bg-background overflow-hidden">

            {/* --- Background Ambience --- */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-3/4 h-full bg-muted/20 skew-x-12 origin-top-right" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">

                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-12 md:mb-20"
                >
                    <span className="text-primary font-bold tracking-widest uppercase text-sm pl-4 border-l-2 border-primary mb-4 block">
                        {t("subtitle")}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-[1.1]">
                        {t("title")}
                    </h2>
                </motion.div>

                {/* --- The Carousel Stage --- */}
                <div
                    className="relative h-[600px] md:h-[500px] w-full"
                    onMouseEnter={() => setIsAutoPlaying(false)}
                    onMouseLeave={() => setIsAutoPlaying(true)}
                >
                    <AnimatePresence initial={false} custom={direction} mode="popLayout">
                        <motion.div
                            key={page}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 }
                            }}
                            className="absolute inset-0 w-full h-full"
                        >
                            <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 h-full items-center">

                                {/* LEFT: Portrait (Dignified Representation) */}
                                <div className="relative h-[300px] lg:h-[500px] w-full lg:w-[450px] mx-auto lg:mx-0">
                                    <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-2xl border border-border/50 group">
                                        <Image
                                            src={story.imageSrc}
                                            alt={story.name}
                                            fill
                                            className="object-cover transition-transform duration-1000 group-hover:scale-105"
                                            sizes="(max-width: 768px) 100vw, 50vw"
                                            priority
                                        />

                                        {/* Texture Overlay */}
                                        <div className="absolute inset-0 bg-texture-paper opacity-20 mix-blend-multiply" />

                                        {/* Video Play Button Overlay */}
                                        {story.videoUrl && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                                                <div className="w-16 h-16 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 transition-transform">
                                                    <Play className="w-6 h-6 text-primary ml-1" fill="currentColor" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Name Tag (Mobile Only) */}
                                        <div className="lg:hidden absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                                            <p className="font-bold text-lg">{story.name}</p>
                                            <p className="text-sm opacity-90">{story.role}</p>
                                        </div>
                                    </div>

                                    {/* Decorative Frame Element */}
                                    <div className="absolute -top-4 -left-4 w-full h-full border-2 border-primary/20 rounded-[2rem] -z-10 hidden lg:block" />
                                </div>

                                {/* RIGHT: Narrative */}
                                <div className="flex flex-col justify-center h-full">
                                    <motion.div
                                        variants={textVariants}
                                        initial="hidden"
                                        animate="visible"
                                        className="space-y-8"
                                    >
                                        {/* Impact Tag */}
                                        {story.impactTag && (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-accent/10 text-accent-foreground text-xs font-bold uppercase tracking-wider">
                                                {story.impactTag}
                                            </span>
                                        )}

                                        {/* Quote */}
                                        <div className="relative">
                                            <Quote className="absolute -top-6 -left-8 w-12 h-12 text-primary/10 rotate-180" />
                                            <blockquote className="text-2xl md:text-3xl lg:text-4xl font-serif font-medium leading-tight text-foreground">
                                                &quot;{story.quote}&quot;
                                            </blockquote>
                                        </div>

                                        {/* Meta Data */}
                                        <div className="border-l-4 border-brand-radiant-gold pl-4 py-1">
                                            <h3 className="text-xl font-bold">{story.name}</h3>
                                            <p className="text-muted-foreground">{story.role}</p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                <MapPin className="w-4 h-4" />
                                                {story.location}
                                            </div>
                                        </div>

                                        {/* Action */}
                                        <div className="pt-4">
                                            <Button asChild size="lg" className="rounded-full px-8 group">
                                                <Link href={`/public/stories/${story.slug}`}>
                                                    {t("read_story")}
                                                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* --- Controls --- */}
                <div className="flex items-center justify-between md:justify-end gap-6 mt-8 md:mt-0 md:absolute md:bottom-0 md:right-4 md:w-1/2 z-20">
                    {/* Pagination Dots */}
                    <div className="flex gap-2">
                        {stories.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    setPage([i, i > index ? 1 : -1]);
                                    setIsAutoPlaying(false);
                                }}
                                className={cn(
                                    "h-2 rounded-full transition-all duration-300",
                                    i === index ? "w-8 bg-primary" : "w-2 bg-border hover:bg-primary/50"
                                )}
                                aria-label={`Go to slide ${i + 1}`}
                            />
                        ))}
                    </div>

                    {/* Arrows */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => { paginate(-1); setIsAutoPlaying(false); }}
                            className="p-3 rounded-full border border-border hover:border-primary hover:text-primary transition-colors bg-background"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => { paginate(1); setIsAutoPlaying(false); }}
                            className="p-3 rounded-full border border-border hover:border-primary hover:text-primary transition-colors bg-background"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>

            </div>
        </section>
    );
}