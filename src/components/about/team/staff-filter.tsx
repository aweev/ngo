"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { TeamMemberViewModel } from "@/types/domain-adapters";

// Define the keys that actually exist in your en.json under "Team.Staff.filters"
const KNOWN_FILTERS = ['all', 'programs', 'operations', 'comms'] as const;
type FilterKey = typeof KNOWN_FILTERS[number];

interface StaffFilterProps {
    staff: TeamMemberViewModel[];
}

export function StaffFilter({ staff }: StaffFilterProps) {
    const t = useTranslations("Team.Staff");
    const [filter, setFilter] = useState("all");

    if (!staff || staff.length === 0) return null;

    const departments = Array.from(new Set(staff.map(s => s.department || "general")));
    const categories = ["all", ...departments];

    const filteredStaff = filter === "all"
        ? staff
        : staff.filter(s => (s.department || "general") === filter);

    // Type Guard to check if a string is a valid translation key
    const isTranslatable = (key: string): key is FilterKey => {
        return KNOWN_FILTERS.includes(key as FilterKey);
    };

    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-serif font-bold text-center mb-10">{t("title")}</h2>

                {/* Filter Tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-12">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-bold transition-all border capitalize",
                                filter === cat
                                    ? "bg-primary text-white border-primary shadow-md"
                                    : "bg-background border-border text-muted-foreground hover:border-primary/50"
                            )}
                        >
                            {/* Type-Safe Translation Logic */}
                            {isTranslatable(cat)
                                ? t(`filters.${cat}`)
                                : cat.replace(/[-_]/g, " ")}
                            aria-pressed={filter === cat}
                            aria-label={`Filter staff by ${cat.replace(/[-_]/g, " ")}`}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <motion.div
                    layout
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredStaff.map((member) => (
                            <motion.div
                                key={member.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                                className="text-center group"
                            >
                                <div className="relative aspect-square rounded-full overflow-hidden mb-4 mx-auto w-32 h-32 border-4 border-transparent group-hover:border-primary/10 transition-all bg-muted">
                                    <Image
                                        src={member.imageSrc}
                                        alt={member.name}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <h4 className="font-bold text-foreground">{member.name}</h4>
                                <p className="text-xs text-muted-foreground">{member.role}</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            </div>
        </section>
    );
}