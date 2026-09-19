"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import { BookOpen, Droplets, Hammer, Laptop } from "lucide-react";
import { useTranslations } from "next-intl";

const LEVELS = [
    { threshold: 10, icon: BookOpen, key: "level_1" },
    { threshold: 50, icon: Droplets, key: "level_2" },
    { threshold: 150, icon: Hammer, key: "level_3" },
    { threshold: 300, icon: Laptop, key: "level_4" },
];

export function ImpactSlider() {
    const t = useTranslations("Donation.ImpactSlider");
    const [value, setValue] = useState([50]);

    const currentLevel = [...LEVELS].reverse().find(l => value[0] >= l.threshold) || LEVELS[0];
    const Icon = currentLevel.icon;

    return (
        <div className="bg-background rounded-[2.5rem] p-8 md:p-12 border border-border shadow-sm text-center">
            <div className="mb-12">
                <motion.div
                    key={currentLevel.key}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary"
                >
                    <Icon className="w-10 h-10" />
                </motion.div>

                <div className="text-5xl font-serif font-bold text-foreground mb-2">€{value[0]}</div>
                <p className="text-muted-foreground font-medium uppercase tracking-widest text-sm">
                    {t(currentLevel.key)}
                </p>
            </div>

            <Slider
                defaultValue={[50]}
                max={500}
                min={10}
                step={10}
                value={value}
                onValueChange={setValue}
                className="w-full cursor-pointer py-4"
            />

            <div className="flex justify-between mt-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                <span>{t("min_label")}</span>
                <span>{t("max_label")}</span>
            </div>
        </div>
    );
}