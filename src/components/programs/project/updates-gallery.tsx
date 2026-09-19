"use client";

import { useTranslations, useFormatter } from "next-intl";
import Image from "next/image";
import { motion } from "framer-motion";
import { ProjectDeepDiveViewModel } from "@/types/domain-adapters";

export function UpdatesGallery({ updates }: { updates: ProjectDeepDiveViewModel['updates'] }) {
    const t = useTranslations("Project.Tabs");
    const format = useFormatter();

    if (!updates || updates.length === 0) return null;

    return (
        <div className="mt-12">
            <h3 className="text-2xl font-serif font-bold mb-6">{t("updates")}</h3>
            
            <div className="columns-1 md:columns-2 gap-4 space-y-4">
                {updates.map((update, i) => (
                    <motion.div
                        key={update.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="break-inside-avoid bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="relative aspect-[4/3] w-full">
                            <Image
                                src={update.imageSrc}
                                alt={update.title}
                                fill
                                className="object-cover"
                            />
                        </div>
                        <div className="p-4">
                            <p className="text-xs font-bold text-primary mb-1">
                                {format.dateTime(new Date(update.date), { dateStyle: 'medium' })}
                            </p>
                            <h4 className="font-bold text-foreground mb-2">{update.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                                {update.description}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}