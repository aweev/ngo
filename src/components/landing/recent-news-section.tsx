"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import { ArrowRight, Calendar, Tag } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { NewsViewModel } from "@/types/domain-adapters";
import { dignifiedReveal, staggeredContainer } from "@/lib/animations";

interface RecentNewsSectionProps {
    news: NewsViewModel[];
    title: string;
    subtitle: string;
    cta: string;
    locale: string;
}

// Type definition for next-intl formatter
type IntlFormatter = ReturnType<typeof useFormatter>;

// --- Sub-Components ---

const NewsCard = ({ item, format }: { item: NewsViewModel; format: IntlFormatter }) => {
    const t = useTranslations("News");

    // Parse date for the badge
    const dateObj = new Date(item.publishedAt);
    const day = format.dateTime(dateObj, { day: '2-digit' });
    const month = format.dateTime(dateObj, { month: 'short' });
    const year = format.dateTime(dateObj, { year: 'numeric' });

    return (
        <Link href={`/public/news/${item.slug}`} className="block h-full">
            <motion.div
                variants={dignifiedReveal}
                whileHover="hover"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                className="group h-full flex flex-col bg-card/50 backdrop-blur-sm rounded-[2rem] border border-border/50 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500"
            >
                {/* Image Container */}
                <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                        src={item.imageSrc}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, 33vw"
                    />

                    {/* Texture Overlay */}
                    <div className="absolute inset-0 bg-texture-paper opacity-20 mix-blend-multiply transition-opacity group-hover:opacity-10" />

                    {/* Gradient for Text Contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                    {/* Floating Date Badge */}
                    <div className="absolute top-4 left-4 bg-background/95 backdrop-blur rounded-xl px-3 py-2 shadow-lg border border-border/50 flex flex-col items-center text-foreground min-w-[60px]">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{month}</span>
                        <span className="text-xl font-serif font-bold leading-none text-primary">{day}</span>
                        <span className="text-[10px] text-muted-foreground/80">{year}</span>
                    </div>

                    {/* Category Pill */}
                    <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-xs font-bold text-primary shadow-sm">
                            <Tag className="w-3 h-3" />
                            {item.category}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-grow p-6 md:p-8 space-y-4 relative">
                    {/* Hover Glow Effect */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-primary/10 transition-colors" />

                    <h3 className="text-xl md:text-2xl font-serif font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {item.title}
                    </h3>

                    <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed flex-grow">
                        {item.excerpt}
                    </p>

                    <div className="pt-4 border-t border-border/40 flex items-center justify-between mt-auto">
                        <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            {item.author?.name && (
                                /* Uses Rich Text Formatting for safe "By [Name]" translation */
                                t.rich('by_author', {
                                    name: item.author.name,
                                    span: (chunks) => <span className="text-foreground">{chunks}</span>
                                })
                            )}
                        </span>

                        <div className="flex items-center gap-2 text-sm font-bold text-primary group/btn">
                            {t('read_article')}
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
};

export function RecentNewsSection({ news, title, subtitle, cta }: RecentNewsSectionProps) {
    const format = useFormatter();

    return (
        <section className="py-24 bg-background relative overflow-hidden">
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
                <div className="absolute -left-20 top-1/3 w-96 h-96 bg-accent/5 rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto px-4 md:px-6 relative z-10">
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="max-w-2xl space-y-4"
                    >
                        <div className="flex items-center gap-2 text-primary font-bold tracking-widest uppercase text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>{subtitle}</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
                            {title}
                        </h2>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <Link
                            href="/public/news"
                            className="group inline-flex items-center gap-2 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {cta}
                            <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center bg-background group-hover:border-primary group-hover:text-primary transition-all">
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:-rotate-45" />
                            </div>
                        </Link>
                    </motion.div>
                </div>

                {/* News Grid */}
                <motion.div
                    variants={staggeredContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                    {news.map((item) => (
                        <NewsCard key={item.id} item={item} format={format} />
                    ))}
                </motion.div>
            </div>
        </section>
    );
}