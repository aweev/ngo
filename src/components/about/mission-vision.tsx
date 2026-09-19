"use client";

import { motion } from "framer-motion";
import { Target, Eye } from "lucide-react";
import { useTranslations } from "next-intl";

export function MissionVision({ content }: {
    content?: { missionTitle: string; missionText: string; visionTitle: string; visionText: string };
} = {}) {
    const t = useTranslations("About.MissionVision");

    const missionTitle = content?.missionTitle || t("mission_title");
    const missionText = content?.missionText || t("mission_text");
    const visionTitle = content?.visionTitle || t("vision_title");
    const visionText = content?.visionText || t("vision_text");

    return (
        <section className="py-24 bg-background relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row gap-8 justify-center items-stretch max-w-5xl mx-auto">

                    {/* Mission Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="flex-1 bg-brand-hopeful-clay text-white p-10 rounded-[2.5rem] shadow-2xl relative z-10"
                    >
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
                            <Target className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-serif font-bold mb-4">{missionTitle}</h2>
                        <p className="text-white/90 text-lg leading-relaxed">{missionText}</p>
                    </motion.div>

                    {/* Vision Card (Offset) */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="flex-1 bg-brand-radiant-gold text-foreground p-10 rounded-[2.5rem] shadow-xl relative md:mt-12 z-0"
                    >
                        <div className="w-14 h-14 bg-black/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
                            <Eye className="w-8 h-8 text-foreground" />
                        </div>
                        <h2 className="text-3xl font-serif font-bold mb-4">{visionTitle}</h2>
                        <p className="text-foreground/80 text-lg leading-relaxed">{visionText}</p>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}