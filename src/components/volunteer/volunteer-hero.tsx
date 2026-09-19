"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { ArrowDown, LogIn } from "lucide-react";
import { dignifiedReveal } from "@/lib/animations";

export function VolunteerHero() {
    const t = useTranslations("Volunteer.Hero");

    const scrollToRoles = () => {
        document.getElementById("role-finder")?.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <section className="relative h-[85vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-black">
            {/* Background Video (Placeholder Image for now) */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-60"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1559027615-cd4628902d4a?q=80&w=2000&auto=format&fit=crop')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>

            <div className="container mx-auto px-4 relative z-10 text-center text-white">
                <motion.div
                    variants={dignifiedReveal}
                    initial="hidden"
                    animate="visible"
                    className="max-w-3xl mx-auto space-y-8"
                >
                    <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight leading-[1.1]">
                        {t("headline")}
                    </h1>
                    <p className="text-xl text-white/90 leading-relaxed max-w-2xl mx-auto">
                        {t("subheadline")}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Button
                            size="lg"
                            className="rounded-full px-8 h-14 text-base font-bold bg-white text-black hover:bg-white/90 w-full sm:w-auto"
                            onClick={scrollToRoles}
                        >
                            {t("cta_primary")}
                            <ArrowDown className="ml-2 w-4 h-4" />
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            size="lg"
                            className="rounded-full px-8 h-14 text-base font-bold bg-transparent border-white text-white hover:bg-white/10 w-full sm:w-auto"
                        >
                            <Link href="/auth/login">
                                <LogIn className="mr-2 w-4 h-4" />
                                {t("cta_secondary")}
                            </Link>
                        </Button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}