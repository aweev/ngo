"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface SkeletonCardProps {
    className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
    return (
        <motion.div
            className={`rounded-xl bg-muted/50 p-6 animate-pulse ${className}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
        >
            <div className="h-6 bg-muted/50 rounded w-3/4 mb-4" />
            <div className="h-4 bg-muted/50 rounded w-1/2 mb-2" />
            <div className="h-4 bg-muted/50 rounded w-5/6" />
        </motion.div>
    );
}

interface SkeletonHeroProps {
    className?: string;
}

export function SkeletonHero({ className = "" }: SkeletonHeroProps) {
    return (
        <section className={`relative w-full min-h-[60dvh] flex flex-col justify-center bg-background overflow-hidden ${className}`}>
            <div className="relative z-10 w-full max-w-7xl px-4 mx-auto md:px-8 lg:px-12 flex-grow flex flex-col justify-center">
                <motion.div
                    className="space-y-6 lg:space-y-8 text-center lg:text-left w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="h-12 bg-muted/50 rounded w-2/3 mx-auto lg:mx-0" />
                    <div className="h-8 bg-muted/50 rounded w-3/4 mx-auto lg:mx-0" />
                    <div className="h-8 bg-muted/50 rounded w-1/2 mx-auto lg:mx-0" />
                    <div className="h-10 bg-muted/50 rounded w-1/3 mx-auto lg:mx-0 mt-4" />
                </motion.div>
                <motion.div
                    className="relative w-full aspect-square lg:aspect-auto lg:h-[400px] lg:w-full mt-8 lg:mt-0"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <div className="absolute inset-2 lg:inset-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-3xl" />
                </motion.div>
            </div>
        </section>
    );
}

export function SkeletonSection({ className = "", count = 3 }: { className?: string; count?: number }) {
    return (
        <section className={`py-16 ${className}`}>
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex items-end justify-between gap-6 mb-8">
                    <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Array.from({ length: count }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}

export function SkeletonGrid({ className = "", count = 6 }: { className?: string; count?: number }) {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}