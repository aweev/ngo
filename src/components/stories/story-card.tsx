"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import { Play, Mic, FileText, Clock } from "lucide-react";
import { StoryViewModel } from "@/types/domain-adapters";
import { ProgramCategory, PROGRAM_THEMES } from "@/lib/program-themes";

export function StoryCard({ story }: { story: StoryViewModel }) {

    // Theme lookup based on program tag
    const programKey = story.program as ProgramCategory;
    const theme = PROGRAM_THEMES[programKey] || PROGRAM_THEMES["education"];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="break-inside-avoid mb-6"
        >
            <Link href={`/public/stories/${story.slug}`} className="group block">
                <article className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">

                    {/* Media Container */}
                    <div className="relative aspect-[4/3] overflow-hidden">
                        <Image
                            src={story.imageSrc}
                            alt={story.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

                        {/* Type Indicator Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50">
                                {story.type === 'video' && <Play className="w-6 h-6 text-white fill-current" />}
                                {story.type === 'audio' && <Mic className="w-6 h-6 text-white" />}
                                {story.type === 'article' && <FileText className="w-6 h-6 text-white" />}
                            </div>
                        </div>

                        {/* Duration Badge */}
                        {story.duration && (
                            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded-md text-[10px] font-bold text-white flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {story.duration}
                            </div>
                        )}

                        {/* Program Tag */}
                        <div className="absolute top-3 left-3">
                            <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md bg-white/90 ${theme.primary}`}>
                                {story.program.replace("-", " ")}
                            </span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col gap-3">
                        <h3 className="text-xl font-serif font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                            {story.title}
                        </h3>

                        <p className="text-sm text-muted-foreground line-clamp-3">
                            {story.summary}
                        </p>

                        <div className="mt-2 flex items-center gap-3 pt-3 border-t border-border/50">
                            <div className="w-8 h-8 rounded-full bg-muted relative overflow-hidden">
                                {story.author.avatar && (
                                    <Image src={story.author.avatar} alt={story.author.name} fill className="object-cover" />
                                )}
                            </div>
                            <div className="text-xs">
                                <p className="font-bold text-foreground">{story.author.name}</p>
                                <p className="text-muted-foreground capitalize">{story.role}</p>
                            </div>
                        </div>
                    </div>
                </article>
            </Link>
        </motion.div>
    );
}