"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ShieldCheck, Ear, Hammer, ArrowRight } from "lucide-react";
import { staggeredContainer, dignifiedReveal } from "@/lib/animations";

export type CoreValueItem = { title: string; description: string; icon?: string };

export function CoreValues({ values: valueProps, title: titleProp }: {
    values?: CoreValueItem[];
    title?: string;
} = {}) {
    const t = useTranslations("About.Values");

    const defaults = [
        { key: "integrity", icon: ShieldCheck },
        { key: "empathy", icon: Ear },
        { key: "agency", icon: Hammer },
    ];

    // Admin-driven values (content `about-values` values[]) with i18n fallback.
    const values = valueProps && valueProps.length > 0
        ? valueProps.map((v, i) => ({ title: v.title, desc: v.description, icon: [ShieldCheck, Ear, Hammer][i % 3] }))
        : defaults.map((v) => ({ title: t(`${v.key}.title`), desc: t(`${v.key}.desc`), icon: v.icon }));

    return (
        <section className="py-24 bg-muted/20">
            <div className="container mx-auto px-4">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggeredContainer}
                    className="text-center mb-16"
                >
                    <motion.h2 variants={dignifiedReveal} className="text-4xl font-serif font-bold text-foreground">
                        {titleProp || t("title")}
                    </motion.h2>
                </motion.div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggeredContainer}
                    className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
                >
                    {values.map((v) => (
                        <motion.div key={v.title} variants={dignifiedReveal} className="bg-background p-8 rounded-2xl shadow-sm border border-border/50 text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                                <v.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{v.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">{v.desc}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}

export function TheoryOfChange({ content }: {
    content?: { title: string; subtitle: string; steps: { title: string; description: string }[] };
} = {}) {
    const t = useTranslations("About.Theory");

    const title = content?.title || t("title");
    const subtitle = content?.subtitle || t("subtitle");
    const stepKeys = ["inputs", "activities", "outputs", "outcomes"];
    const steps = content?.steps && content.steps.length > 0
        ? content.steps
        : stepKeys.map((step) => ({ title: t(step), description: t(`${step}_desc`) }));

    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <h2 className="text-4xl font-serif font-bold text-foreground mb-4">{title}</h2>
                    <p className="text-muted-foreground">{subtitle}</p>
                </div>

                {/* Screen Reader Only Description */}
                <p className="sr-only">{t("sr_desc")}</p>

                <div className="flex flex-col lg:flex-row items-stretch justify-center gap-4 lg:gap-0 max-w-6xl mx-auto">
                    {steps.map((step, idx) => (
                        <div key={`${step.title}-${idx}`} className="flex flex-col lg:flex-row items-center flex-1">
                            {/* Card */}
                            <div className="w-full bg-card border border-border rounded-xl p-6 relative group hover:border-primary/50 transition-colors h-full flex flex-col justify-center min-h-[160px]">
                                <span className="absolute top-4 right-4 text-6xl font-bold text-muted/10 font-serif -z-0">0{idx + 1}</span>
                                <h4 className="font-bold text-lg mb-2 relative z-10 capitalize text-foreground">{step.title}</h4>
                                <p className="text-sm text-muted-foreground relative z-10">{step.description}</p>
                            </div>

                            {/* Arrow (Hidden on last item) */}
                            {idx < steps.length - 1 && (
                                <div className="flex items-center justify-center p-4 text-muted-foreground/30">
                                    <ArrowRight className="w-6 h-6 rotate-90 lg:rotate-0" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}