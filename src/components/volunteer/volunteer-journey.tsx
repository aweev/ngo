"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { UserPlus, BookOpen, GraduationCap, HeartHandshake } from "lucide-react";

export function VolunteerJourney() {
    const t = useTranslations("Volunteer.Journey");

    const steps = [
        { icon: UserPlus, key: "step_1" },
        { icon: BookOpen, key: "step_2" },
        { icon: GraduationCap, key: "step_3" },
        { icon: HeartHandshake, key: "step_4" },
    ];

    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-serif font-bold text-center mb-16 text-foreground">
                    {t("title")}
                </h2>

                <div className="relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-20 right-20 h-0.5 bg-border -z-10" />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        {steps.map((step, i) => (
                            <motion.div
                                key={step.key}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="flex flex-col items-center text-center group"
                            >
                                <div className="w-24 h-24 rounded-full bg-background border-4 border-muted group-hover:border-primary transition-colors flex items-center justify-center mb-6 relative z-10 shadow-sm">
                                    <step.icon className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors" />
                                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm border-4 border-white">
                                        {i + 1}
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-foreground mb-1">{t(step.key)}</h3>
                                <p className="text-sm text-muted-foreground">{t(`${step.key}_desc`)}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}