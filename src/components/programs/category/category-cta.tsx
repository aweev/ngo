"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import { Heart, HandHeart } from "lucide-react";
import { ProgramCategory, PROGRAM_THEMES } from "@/lib/program-themes";
import { donationPath, volunteerPath } from "@/lib/program-routes";

export function CategoryCTA({ category }: { category: ProgramCategory }) {
    const t = useTranslations("Programs.Category.CTA");
    const theme = PROGRAM_THEMES[category];

    return (
        <section className={`py-24 relative overflow-hidden ${theme.bg}`}>
            <div className="absolute inset-0 bg-texture-paper opacity-20 mix-blend-multiply" />

            <div className="container mx-auto px-4 relative z-10 text-center">
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-8">
                    {t("title")}
                </h2>

                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button asChild size="lg" className="rounded-full px-8 h-14 text-lg shadow-xl shadow-primary/20">
                        <Link href={donationPath({ fund: category })}>
                            <Heart className="w-5 h-5 mr-2 fill-current" />
                            {t("donate", { category: category.replace('-', ' ') })}
                        </Link>
                    </Button>

                    <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-14 text-lg bg-background/50 backdrop-blur-sm border-2">
                        <Link href={volunteerPath({ interest: category })}>
                            <HandHeart className="w-5 h-5 mr-2" />
                            {t("volunteer", { category: category.replace('-', ' ') })}
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}