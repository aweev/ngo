"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { Users, ShieldCheck, Share2, ArrowRight } from "lucide-react";

export function ExploreNav() {
    const t = useTranslations("Navigation.about_items");
    const tCommon = useTranslations("Common");

    const cards = [
        { key: "team", icon: Users, href: "/public/about/team", color: "text-blue-500", bg: "bg-blue-500/10" },
        { key: "financials", icon: ShieldCheck, href: "/public/about/financials", color: "text-green-500", bg: "bg-green-500/10" },
        { key: "partners", icon: Share2, href: "/public/about/partners", color: "text-purple-500", bg: "bg-purple-500/10" },
    ];

    return (
        <section className="py-16 bg-background border-t border-border">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-3 gap-6">
                    {cards.map((card) => (
                        <Link
                            key={card.key}
                            href={card.href}
                            className="group flex flex-col p-6 rounded-2xl border border-border hover:border-primary/30 hover:shadow-lg transition-all"
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.bg} ${card.color}`}>
                                <card.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold font-serif mb-2 group-hover:text-primary transition-colors">
                                {t(`${card.key}.label`)}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4 grow">
                                {t(`${card.key}.desc`)}
                            </p>
                            <div className="flex items-center text-sm font-bold text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                                {tCommon("explore")} <ArrowRight className="w-4 h-4 ml-2" />
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}