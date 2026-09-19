"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Download, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";

export function PartnershipCTA({ deckHref }: { deckHref?: string }) {
    const t = useTranslations("Partners.CTA");

    // FIX: Define as 'const' so TypeScript knows these are specific keys, not just strings
    const benefits = ["benefit_1", "benefit_2", "benefit_3"] as const;

    return (
        <section className="py-24 bg-muted/30 border-t border-border/50">
            <div className="container mx-auto px-4">
                <div className="bg-background rounded-[2.5rem] shadow-2xl border border-border/50 overflow-hidden">
                    <div className="grid lg:grid-cols-2">

                        {/* Left: Value Proposition */}
                        <div className="p-8 md:p-16 bg-primary/5 flex flex-col justify-center">
                            <h3 className="text-2xl font-bold font-serif mb-8 text-foreground">
                                {t("benefits_title")}
                            </h3>
                            <ul className="space-y-6">
                                {benefits.map((key) => (
                                    <motion.li
                                        key={key}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        className="flex items-start gap-4"
                                    >
                                        <div className="mt-1 shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                            <CheckCircle className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                        {/* FIX: Now 'key' is strongly typed as "benefit_1" | "benefit_2" | "benefit_3" */}
                                        <span className="text-lg font-medium text-foreground/80">{t(key)}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        </div>

                        {/* Right: Actions */}
                        <div className="p-8 md:p-16 flex flex-col justify-center items-start space-y-8">
                            <h2 className="text-4xl font-serif font-bold text-foreground">
                                {t("title")}
                            </h2>

                            <div className="flex flex-col sm:flex-row gap-4 w-full">
                                {/* Primary Action - High Visibility */}
                                {deckHref && (
                                    <Button asChild size="lg" className="h-14 px-8 rounded-full text-base font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform">
                                        <a href={deckHref} download target="_blank" rel="noreferrer">
                                            <Download className="w-5 h-5 mr-2" />
                                            {t("btn_deck")}
                                        </a>
                                    </Button>
                                )}

                                {/* Secondary Action */}
                                <Button asChild variant="outline" size="lg" className="h-14 px-8 rounded-full text-base font-bold border-2 hover:bg-muted transition-colors">
                                    <Link href="/public/contact?subject=partnership">
                                        <Mail className="w-5 h-5 mr-2" />
                                        {t("btn_contact")}
                                    </Link>
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}