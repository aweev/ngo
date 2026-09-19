"use client";

import { useTranslations } from "next-intl";
import { Users, Target, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { staggeredContainer, dignifiedReveal } from "@/lib/animations";

export function BusinessCase() {
    const t = useTranslations("Corporate.ROI");

    const items = [
        { key: "engagement", icon: Users },
        { key: "brand", icon: Globe },
        { key: "sdg", icon: Target },
    ];

    return (
        <section className="py-24 bg-background transition-colors duration-300">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-serif font-bold text-foreground">{t("title")}</h2>
                </div>

                <motion.div
                    variants={staggeredContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-3 gap-12"
                >
                    {items.map((item) => (
                        <motion.div key={item.key} variants={dignifiedReveal} className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-muted/30 border border-border rounded-full flex items-center justify-center mb-6 text-foreground">
                                <item.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground mb-3">
                                {t(`${item.key}_title`)}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed max-w-sm">
                                {t(`${item.key}_desc`)}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}