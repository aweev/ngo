"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { PenTool } from "lucide-react";
import { dignifiedReveal } from "@/lib/animations";

export function StoriesHero() {
    const t = useTranslations("Stories.Hero");

    return (
        <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center overflow-hidden bg-background">
            {/* Collage Background (Grayscale/Duotone) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
                <div
                    className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1531545514256-b1400bc00f31?auto=format&fit=crop&q=80')] bg-cover bg-center grayscale mix-blend-multiply"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            </div>

            <div className="container mx-auto px-4 relative z-10 text-center">
                <motion.div
                    variants={dignifiedReveal}
                    initial="hidden"
                    animate="visible"
                    className="max-w-3xl mx-auto space-y-6"
                >
                    <h1 className="text-5xl md:text-7xl font-serif font-bold text-foreground leading-[1.1]">
                        {t("headline")}
                    </h1>
                    <p className="text-xl text-muted-foreground font-light leading-relaxed max-w-2xl mx-auto">
                        {t("subheadline")}
                    </p>

                    <div className="pt-4">
                        <Button asChild size="lg" className="rounded-full px-8 shadow-xl">
                            {/* Routes to Member Portal */}
                            <Link href="/auth/login?redirect=/dashboard/stories/new">
                                <PenTool className="w-4 h-4 mr-2" />
                                {t("cta")}
                            </Link>
                        </Button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}