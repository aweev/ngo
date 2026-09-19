"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { dignifiedReveal } from "@/lib/animations";

export function ContactHero() {
    const t = useTranslations("Contact.Hero");

    return (
        <section className="bg-brand-hopeful-clay/10 py-20 md:py-28 text-center">
            <div className="container mx-auto px-4">
                <motion.div
                    variants={dignifiedReveal}
                    initial="hidden"
                    animate="visible"
                    className="max-w-2xl mx-auto space-y-4"
                >
                    <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground">
                        {t("headline")}
                    </h1>
                    <p className="text-xl text-muted-foreground font-light">
                        {t("subheadline")}
                    </p>
                </motion.div>
            </div>
        </section>
    );
}