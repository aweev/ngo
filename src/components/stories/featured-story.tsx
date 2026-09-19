"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { Play, ArrowRight, Headphones } from "lucide-react";
import { StoryViewModel } from "@/types/domain-adapters";
import { dignifiedReveal } from "@/lib/animations";

export function FeaturedStory({ story }: { story: StoryViewModel }) {
    const t = useTranslations("Stories.Featured");

    if (!story) return null;

    return (
        <section className="py-12 container mx-auto px-4">
            <motion.div
                variants={dignifiedReveal}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-[2rem] overflow-hidden group cursor-pointer shadow-2xl"
            >
                <Link href={`/public/stories/${story.slug}`}>
                    {/* Background */}
                    <Image
                        src={story.imageSrc}
                        alt={story.title}
                        fill
                        className="object-cover transition-transform duration-[1.5s] group-hover:scale-105"
                        priority
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-3xl text-white">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-radiant-gold text-black text-xs font-bold uppercase tracking-widest mb-4">
                            {t("badge")}
                        </div>

                        <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4 leading-tight">
                            {story.title}
                        </h2>

                        <p className="text-lg md:text-xl text-white/80 line-clamp-2 mb-8">
                            {story.summary}
                        </p>

                        <div className="flex items-center gap-2 text-sm font-bold bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full w-fit hover:bg-white hover:text-black transition-all">
                            {story.type === 'video' && <><Play className="w-4 h-4 fill-current" /> {t("watch")}</>}
                            {story.type === 'audio' && <><Headphones className="w-4 h-4" /> {t("listen")}</>}
                            {story.type === 'article' && <><span className="w-4 h-4" /> {t("read")}</>}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </div>
                    </div>
                </Link>
            </motion.div>
        </section>
    );
}