"use client";

import { useTranslations } from "next-intl";
import { Users, TrendingUp, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { staggeredContainer, dignifiedReveal } from "@/lib/animations";

export function VolunteerBenefits() {
    const t = useTranslations("Volunteer.Benefits");

    const benefits = [
        { key: "community", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
        { key: "skills", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10" },
        { key: "impact", icon: Heart, color: "text-rose-500", bg: "bg-rose-500/10" },
    ];

    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-4">
                <motion.div
                    variants={staggeredContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-3 gap-8"
                >
                    {benefits.map((benefit) => (
                        <motion.div
                            key={benefit.key}
                            variants={dignifiedReveal}
                            className="bg-card p-8 rounded-3xl border border-border/50 shadow-sm text-center hover:shadow-lg transition-shadow duration-300"
                        >
                            <div className={`w-16 h-16 rounded-2xl ${benefit.bg} ${benefit.color} flex items-center justify-center mx-auto mb-6`}>
                                <benefit.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold font-serif mb-3 text-foreground">
                                {t(`${benefit.key}_title`)}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {t(`${benefit.key}_desc`)}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}