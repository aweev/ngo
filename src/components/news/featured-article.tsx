"use client";

import Image from "next/image";
import { Link } from "@/lib/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { ArrowRight, Clock } from "lucide-react";
import { NewsViewModel } from "@/types/domain-adapters";
import { motion } from "framer-motion";
import { dignifiedReveal } from "@/lib/animations";

export function FeaturedArticle({ article }: { article: NewsViewModel }) {
    const t = useTranslations("News.Hub");
    const format = useFormatter();

    if (!article) return null;

    return (
        <section className="container mx-auto px-4 -mt-12 relative z-20 mb-20">
            <motion.div
                variants={dignifiedReveal}
                initial="hidden"
                animate="visible"
                className="bg-background rounded-3xl overflow-hidden shadow-2xl border border-border/50 grid lg:grid-cols-3 min-h-[500px]"
            >
                {/* Image Side (2/3) */}
                <div className="lg:col-span-2 relative min-h-[300px] lg:min-h-full group">
                    <Image
                        src={article.imageSrc}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-105"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent lg:hidden" />
                </div>

                {/* Content Side (1/3) */}
                <div className="lg:col-span-1 p-8 md:p-12 flex flex-col justify-center bg-card">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                            {t("featured_badge")}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {article.category}
                        </span>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4 leading-tight">
                        {article.title}
                    </h2>

                    <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                        {article.excerpt}
                    </p>

                    <div className="mt-auto pt-6 border-t border-border flex flex-col gap-4">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                            <span>{article.author?.name}</span>
                            <span>•</span>
                            <span>{format.dateTime(new Date(article.publishedAt), { month: 'short', day: 'numeric' })}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 5 min</span>
                        </div>

                        <Link href={`/public/news/${article.slug}`} className="inline-flex items-center text-primary font-bold hover:underline underline-offset-4">
                            {t("read_full")}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}