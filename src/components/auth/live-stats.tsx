"use client";

import { useTranslations } from "next-intl";
import { Users, Heart, Globe } from "lucide-react";
import type { PortalExperienceItem } from "@/types/domain/portal-experience";

const icons = { users: Users, heart: Heart, globe: Globe };

export function AuthLiveStats({ items = [] }: { items?: PortalExperienceItem[] }) {
    const t = useTranslations("Auth.Stats");

    const fallbackStats = [
        { icon: Users, label: t("volunteers"), value: "1,204" },
        { icon: Heart, label: t("lives"), value: "15k+" },
        { icon: Globe, label: t("projects"), value: "142" },
    ];
    const stats = items.length > 0
        ? items.map((item) => ({ icon: icons[item.icon as keyof typeof icons] || Globe, label: item.label, value: item.value || "-" }))
        : fallbackStats;

    return (
        <div className="grid grid-cols-3 divide-x divide-white/10">
            {stats.map((stat, i) => (
                <div key={i} className="p-6 flex flex-col items-center text-center">
                    <stat.icon className="w-5 h-5 text-brand-radiant-gold mb-2" />
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">{stat.label}</p>
                </div>
            ))}
        </div>
    );
}