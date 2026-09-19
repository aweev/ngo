"use client";

import { useTranslations } from "next-intl";
import { Mail, Megaphone, MapPin, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { staggeredContainer, dignifiedReveal } from "@/lib/animations";

export function DirectChannels() {
    const t = useTranslations("Contact.Channels");

    const channels = [
        { key: "general", icon: Mail, detail: t("general_email"), link: `mailto:${t("general_email")}` },
        { key: "press", icon: Megaphone, detail: t("press_email"), link: `mailto:${t("press_email")}` },
        { key: "visit", icon: MapPin, detail: t("visit_address"), link: "https://maps.google.com" },
    ];

    return (
        <section className="container mx-auto px-4 -mt-8 relative z-10">
            <motion.div
                variants={staggeredContainer}
                initial="hidden"
                animate="visible"
                className="grid md:grid-cols-3 gap-6"
            >
                {channels.map((c) => (
                    <motion.a
                        key={c.key}
                        href={c.link}
                        target={c.key === 'visit' ? '_blank' : undefined}
                        variants={dignifiedReveal}
                        className="bg-card p-6 rounded-2xl shadow-lg border border-border/50 flex items-center gap-4 hover:border-primary/30 transition-all group"
                    >
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <c.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">{t(`${c.key}_title`)}</h3>
                            <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                                {c.detail}
                                {c.key === 'visit' && <ArrowUpRight className="w-3 h-3" />}
                            </p>
                        </div>
                    </motion.a>
                ))}
            </motion.div>
        </section>
    );
}