"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/lib/navigation";
import Image from "next/image";
import { ChevronRight, Clock, Calendar } from "lucide-react";
import { ArticleDeepDiveViewModel } from "@/types/domain-adapters";
import { motion } from "framer-motion";
import { dignifiedReveal } from "@/lib/animations";

export function ArticleHeader({ article }: { article: ArticleDeepDiveViewModel }) {
    const t = useTranslations("News.Article");
    const format = useFormatter();

    return (
        <header className="container mx-auto px-4 pt-32 pb-12">
            <motion.div
                variants={dignifiedReveal}
                initial="hidden"
                animate="visible"
                className="max-w-3xl mx-auto text-center"
            >
                {/* Breadcrumbs */}
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-8">
                    <Link href="/public/news" className="hover:text-primary transition-colors">{t("breadcrumbs.news")}</Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-primary font-bold uppercase tracking-wider text-xs px-2 py-1 bg-primary/10 rounded-md">
                        {article.category}
                    </span>
                </div>

                {/* Headline */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-8 leading-[1.15]">
                    {article.title}
                </h1>

                {/* Meta Row */}
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground border-y border-border/50 py-6">
                    <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted">
                            {article.author.avatar && (
                                <Image src={article.author.avatar} alt={article.author.name} fill className="object-cover" />
                            )}
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-foreground">{article.author.name}</p>
                            <p className="text-xs">{article.author.role || t("author.role")}</p>
                        </div>
                    </div>

                    <div className="w-px h-8 bg-border hidden sm:block" />

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {format.dateTime(new Date(article.publishedAt), { dateStyle: 'medium' })}
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {t("meta.read_time", { min: article.readTimeMinutes })}
                        </div>
                    </div>
                </div>
            </motion.div>
        </header>
    );
}