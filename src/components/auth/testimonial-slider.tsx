"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Quote } from "lucide-react";
import type { PortalExperienceItem } from "@/types/domain/portal-experience";

export function AuthTestimonialSlider({ items = [] }: { items?: Array<PortalExperienceItem & { author?: string }> }) {
    const t = useTranslations("Auth.Testimonials");
    const [index, setIndex] = useState(0);
    const fallbackTestimonials = [
        { text: t("t1"), author: t("t1_author") },
        { text: t("t2"), author: t("t2_author") },
        { text: t("t3"), author: t("t3_author") }
    ];
    const testimonials = items.length > 0
        ? items.map((item) => ({ text: item.label, author: item.author || t("t1_author") }))
        : fallbackTestimonials;

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % testimonials.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [testimonials.length]);

    return (
        <div className="min-h-[200px]">
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                >
                    <Quote className="w-10 h-10 text-brand-radiant-gold mb-6 opacity-80" />
                    <p className="text-3xl font-serif font-medium leading-tight text-white mb-6">
                        &quot;{testimonials[index].text}&quot;
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="h-px w-8 bg-brand-radiant-gold" />
                        <p className="text-sm font-bold uppercase tracking-wider text-white/80">
                            {testimonials[index].author}
                        </p>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}