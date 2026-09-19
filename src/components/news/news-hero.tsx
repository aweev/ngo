// components/news/news-hero.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/lib/navigation";
import { useSearchParams } from "next/navigation";
import { dignifiedReveal } from "@/lib/animations";

export function NewsHero() {
    const t = useTranslations("News.Hub");
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(searchParams.get("q") || "");

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams);
        if (query) params.set("q", query);
        else params.delete("q");
        router.push(`/public/news?${params.toString()}`);
    };

    return (
        <section className="bg-slate-900 py-24 md:py-32 text-center text-white relative overflow-hidden">
            {/* Abstract Background */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 via-slate-900 to-slate-900" />

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    variants={dignifiedReveal}
                    initial="hidden"
                    animate="visible"
                    className="max-w-2xl mx-auto space-y-6"
                >
                    <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight">
                        {t("hero_title")}
                    </h1>
                    <p className="text-xl text-slate-300 font-light">
                        {t("hero_subtitle")}
                    </p>

                    <form onSubmit={handleSearch} className="relative max-w-md mx-auto pt-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t("search_placeholder")}
                            className="pl-12 h-14 rounded-full bg-white/10 border-white/10 text-white placeholder:text-slate-400 focus-visible:ring-primary/50 focus-visible:border-primary transition-all"
                        />
                    </form>
                </motion.div>
            </div>
        </section>
    );
}
