"use client";

import Image from "next/image";
import { Link } from "@/lib/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { ArrowRight } from "lucide-react";
import { NewsViewModel } from "@/types/domain-adapters";
import { motion } from "framer-motion";
import { staggeredContainer, dignifiedReveal } from "@/lib/animations";

export function NewsGrid({ articles }: { articles: NewsViewModel[] }) {
    const t = useTranslations("News.Hub");
    const format = useFormatter();

    if (!articles.length) {
        return (
            <div className="text-center py-20 text-muted-foreground">
                {t("no_results")}
            </div>
        );
    }

    return (
        <section className="container mx-auto px-4 pb-24">
            <motion.div
                variants={staggeredContainer}
                initial="hidden"
                animate="visible"
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
                {articles.map((article) => (
                    <motion.div key={article.id} variants={dignifiedReveal}>
                        <Link href={`/public/news/${article.slug}`} className="group block h-full">
                            <article className="h-full flex flex-col bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                {/* Thumbnail */}
                                <div className="relative aspect-[16/9] overflow-hidden">
                                    <Image
                                        src={article.imageSrc}
                                        alt={article.title}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className="px-2 py-1 rounded bg-background/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-foreground">
                                            {article.category}
                                        </span>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-6 flex flex-col flex-grow">
                                    <span className="text-xs text-muted-foreground font-medium mb-3">
                                        {format.dateTime(new Date(article.publishedAt), { dateStyle: 'medium' })}
                                    </span>

                                    <h3 className="text-xl font-serif font-bold text-foreground mb-3 leading-tight group-hover:text-primary transition-colors">
                                        {article.title}
                                    </h3>

                                    <p className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-grow">
                                        {article.excerpt}
                                    </p>

                                    <div className="flex items-center text-sm font-bold text-primary mt-auto">
                                        {t("read_more")}
                                        <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </article>
                        </Link>
                    </motion.div>
                ))}
            </motion.div>

            {/* Pagination Placeholder */}
            <div className="mt-16 text-center">
                <button className="px-8 py-3 rounded-full border border-border hover:bg-muted text-sm font-bold transition-colors">
                    {t("load_more")}
                </button>
            </div>
        </section>
    );
}