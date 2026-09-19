"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, Scale, Users, Zap, LucideIcon } from "lucide-react";
import { MissionViewModel } from "@/types/domain-adapters";

const ICON_MAP: Record<string, LucideIcon> = {
    Heart,
    Scale,
    Users,
    Zap
};

export function MissionSection({ content }: { content: MissionViewModel }) {
    return (
        <section id="mission-section" className="py-24 lg:py-32 bg-background relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-linear-to-l from-muted/30 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

            {/* FIX: Added mx-auto here */}
            <div className="container mx-auto px-4 md:px-6 relative z-10">
                <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="relative order-2 lg:order-1"
                    >
                        <div className="relative aspect-4/5 w-full max-w-lg mx-auto lg:max-w-none rounded-3xl overflow-hidden shadow-2xl border border-border/50">
                            {content.imageSrc ? <Image src={content.imageSrc} alt="AWE e.V. Community Work" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover hover:scale-105 transition-transform duration-[1.5s]" /> : <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_35%_30%,hsl(var(--primary)/.28),transparent_45%),linear-gradient(145deg,hsl(var(--muted)),hsl(var(--background)))]"><Users className="h-20 w-20 text-primary/40" aria-hidden="true" /></div>}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                            <div className="absolute bottom-8 left-8 right-8">
                                <div className="bg-background/95 backdrop-blur-md p-6 rounded-2xl shadow-lg border-l-4 border-primary">
                                    <p className="font-serif italic text-foreground text-lg leading-relaxed">
                                        &quot;Dignity is not a gift we give, but a right we uphold.&quot;
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -top-6 -left-6 w-full h-full border-2 border-primary/20 rounded-3xl -z-10 hidden md:block" />
                    </motion.div>

                    <div className="space-y-10 order-1 lg:order-2">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="space-y-6"
                        >
                            <span className="text-primary font-bold tracking-widest uppercase text-sm pl-4 border-l-2 border-primary">
                                {content.preheadline}
                            </span>
                            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground leading-[1.1]">
                                {content.headline}
                            </h2>
                            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                                {content.description}
                            </p>
                        </motion.div>

                        <div className="grid gap-8">
                            {content.values.map((value, idx) => {
                                const Icon = ICON_MAP[value.icon] || Heart;
                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, x: 20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: 0.2 + (idx * 0.1) }}
                                        className="flex gap-5 group"
                                    >
                                        <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-card border border-border/50 flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                                            <Icon className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-colors duration-300">
                                                {value.title}
                                            </h3>
                                            <p className="text-muted-foreground leading-relaxed">
                                                {value.description}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}