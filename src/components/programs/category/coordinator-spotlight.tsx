"use client";

import Image from "next/image";
import { Quote } from "lucide-react";
import { ProgramCategory, PROGRAM_THEMES } from "@/lib/program-themes";

interface SpotlightProps {
    quote: string;
    name: string;
    role: string;
    imageSrc: string;
    category: ProgramCategory;
}

export function CoordinatorSpotlight({ quote, name, role, imageSrc, category }: SpotlightProps) {
    const theme = PROGRAM_THEMES[category];

    return (
        <section className="py-24 bg-muted/10">
            <div className="container mx-auto px-4">
                <div className={`max-w-4xl mx-auto bg-background rounded-[3rem] p-10 md:p-16 shadow-xl border border-border/50 relative overflow-hidden ${theme.shadow}`}>
                    {/* Decorative Blob */}
                    <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl ${theme.gradient} blur-3xl opacity-50 pointer-events-none`} />

                    <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
                        <div className="w-32 h-32 md:w-48 md:h-48 relative flex-shrink-0">
                            <Image
                                src={imageSrc}
                                alt={name}
                                fill
                                className={`object-cover rounded-full border-4 shadow-lg ${theme.border} bg-muted`}
                            />
                            <div className={`absolute -bottom-2 -right-2 w-12 h-12 rounded-full ${theme.bg} flex items-center justify-center border-4 border-background`}>
                                <Quote className={`w-5 h-5 ${theme.primary}`} />
                            </div>
                        </div>

                        <div className="text-center md:text-left">
                            <blockquote className="text-2xl md:text-3xl font-serif font-medium text-foreground leading-relaxed mb-6">
                                &quot;{quote}&quot;
                            </blockquote>
                            <div>
                                <div className="font-bold text-lg text-foreground">{name}</div>
                                <div className={`text-sm font-bold uppercase tracking-wider ${theme.primary}`}>
                                    {role}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}