"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { dignifiedReveal } from "@/lib/animations";
import { StoryDeepDiveViewModel } from "@/types/domain-adapters";

export function StoryHeader({ story }: { story: StoryDeepDiveViewModel }) {

    return (
        <section className="relative h-screen w-full overflow-hidden flex items-end">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                {/* 
                   Priority: Video if available (Looping, Muted) -> Image Fallback
                   This creates the "Cinematic" feel requested in the PDF.
                */}
                {story.type === 'video' && story.mediaUrl ? (
                    <video
                        src={story.mediaUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                        poster={story.imageSrc}
                    />
                ) : (
                    <Image
                        src={story.imageSrc}
                        alt={story.title}
                        fill
                        className="object-cover"
                        priority
                    />
                )}

                {/* Cinematic Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90" />
            </div>

            {/* Content Layer */}
            <div className="container mx-auto px-4 pb-20 relative z-10 text-white">
                <motion.div
                    variants={dignifiedReveal}
                    initial="hidden"
                    animate="visible"
                    className="max-w-4xl"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <span className="px-3 py-1 rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-widest">
                            {story.program}
                        </span>
                        <span className="text-white/80 font-medium tracking-wide uppercase text-xs">
                            {story.author.name}
                        </span>
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-[1.1] mb-6">
                        {story.title}
                    </h1>

                    <p className="text-xl md:text-2xl text-white/80 font-light max-w-2xl leading-relaxed">
                        {story.summary}
                    </p>
                </motion.div>
            </div>
        </section>
    );
}