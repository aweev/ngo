"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const CATEGORIES = ["all", "program-update", "thought-leadership", "press", "event"];

export function CategoryNav() {
    const t = useTranslations("News.Hub.Categories");
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentCat = searchParams.get("category") || "all";

    const handleCategory = (cat: string) => {
        const params = new URLSearchParams(searchParams);
        if (cat === "all") params.delete("category");
        else params.set("category", cat);
        router.push(`/public/news?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="sticky top-20 z-30 bg-background/95 backdrop-blur-sm border-b border-border/60 mb-12">
            <div className="container mx-auto px-4 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-8 min-w-max">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => handleCategory(cat)}
                            className={cn(
                                "py-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors",
                                currentCat === cat
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t(cat)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}