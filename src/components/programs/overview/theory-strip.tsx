"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { HeartPulse, GraduationCap, Briefcase, Users2 } from "lucide-react";
import { dignifiedReveal, staggeredContainer } from "@/lib/animations";

export function TheoryConnectiveStrip() {
    const t = useTranslations("Programs.Overview.Theory");

    const steps = [
        { id: "step_1", icon: HeartPulse, color: "text-rose-500", bg: "bg-rose-500/10" },
        { id: "step_2", icon: GraduationCap, color: "text-blue-500", bg: "bg-blue-500/10" },
        { id: "step_3", icon: Briefcase, color: "text-amber-500", bg: "bg-amber-500/10" },
        { id: "step_4", icon: Users2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    ];

    return (
        <section className="py-24 bg-background border-b border-border/50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-20">
                    <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground block mb-3">
                        {t("subtitle")}
                    </span>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
                        {t("title")}
                    </h2>
                </div>

                <div className="relative">
                    {/* Connecting Line (Desktop Only) */}
                    <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -z-10" />

                    <motion.div
                        variants={staggeredContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-4"
                    >
                        {steps.map((step, index) => (
                            <motion.div
                                key={step.id}
                                variants={dignifiedReveal}
                                className="relative flex flex-col items-center text-center group"
                            >
                                {/* Icon Circle */}
                                <div className={`w-24 h-24 rounded-full ${step.bg} border-4 border-background flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                                    <step.icon className={`w-10 h-10 ${step.color}`} />
                                </div>

                                {/* Mobile Vertical Line */}
                                {index < steps.length - 1 && (
                                    <div className="md:hidden absolute top-24 bottom-[-48px] w-0.5 bg-border -z-10" />
                                )}

                                <h3 className="text-lg font-bold text-foreground mb-2 px-4">
                                    {t(step.id)}
                                </h3>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}