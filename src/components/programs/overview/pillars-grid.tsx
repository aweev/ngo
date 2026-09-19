"use client";

import { Link } from "@/lib/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Briefcase, GraduationCap, HeartPulse, Users2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { programCategoryPath } from "@/lib/program-routes";
import type { ProgramCategory } from "@/lib/program-themes";

const PILLARS: Array<{ id: ProgramCategory; icon: typeof Briefcase; colorClass: string; image: string }> = [
    {
        id: "economic-empowerment",
        icon: Briefcase,
        colorClass: "bg-primary", // Maps to your orange
        image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=1200",
    },
    {
        id: "education",
        icon: GraduationCap,
        colorClass: "bg-blue-600",
        image: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=1200",
    },
    {
        id: "health",
        icon: HeartPulse,
        colorClass: "bg-rose-600",
        image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=1200",
    },
    {
        id: "social-integration",
        icon: Users2,
        colorClass: "bg-emerald-600",
        image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1200",
    },
];

export function PillarsGrid() {
    const t = useTranslations("Programs.Overview.Pillars");

    return (
        <section id="pillars-grid" className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 h-auto md:h-[100vh]">
                {PILLARS.map((pillar) => (
                    <Link
                        key={pillar.id}
                        href={programCategoryPath(pillar.id)}
                        className="relative group overflow-hidden h-[50vh] md:h-full w-full block"
                    >
                        {/* Background Image (Scales on Hover) */}
                        <div className="absolute inset-0 transform transition-transform duration-1000 group-hover:scale-110">
                            <Image
                                src={pillar.image}
                                alt={t(pillar.id)}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 50vw"
                            />
                        </div>

                        {/* Color Overlay (Deepens on Hover) */}
                        <div className={cn(
                            "absolute inset-0 transition-opacity duration-500 opacity-60 group-hover:opacity-85 mix-blend-multiply",
                            pillar.colorClass
                        )} />

                        {/* Content Container */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10 text-white">

                            {/* Icon (Floats up on Hover) */}
                            <div className="transform transition-transform duration-500 group-hover:-translate-y-6">
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/30">
                                    <pillar.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                                </div>
                            </div>

                            {/* Title */}
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-4 transform transition-transform duration-500 group-hover:-translate-y-4 shadow-black drop-shadow-lg">
                                {t(pillar.id)}
                            </h2>

                            {/* Hidden Description & Button (Reveals on Hover) */}
                            <div className="h-0 opacity-0 overflow-hidden group-hover:h-auto group-hover:opacity-100 transition-all duration-500 delay-75 flex flex-col items-center">
                                <p className="text-lg font-medium text-white/90 max-w-sm mb-8 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                    {t(`desc_${pillar.id}`)}
                                </p>

                                <span className="inline-flex items-center px-8 py-3 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition-colors shadow-lg">
                                    {t("explore")}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}