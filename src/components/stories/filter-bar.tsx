"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { STORY_FORMATS, STORY_ROLES } from "@/types/domain-adapters"; // Import constants

const PROGRAMS = ["education", "health", "economic-empowerment", "social-integration"] as const;

export function FilterBar() {
    const t = useTranslations("Stories.Filters");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [search, setSearch] = useState(searchParams.get("q") || "");
    const debouncedSearch = useDebounce(search, 500);

    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (debouncedSearch) {
            params.set("q", debouncedSearch);
        } else {
            params.delete("q");
        }
        params.set("page", "1");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch]);

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value && value !== "all") {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        params.set("page", "1");
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const clearFilters = () => {
        setSearch("");
        router.replace(pathname, { scroll: false });
    };

    const hasFilters = searchParams.toString().length > 0;

    return (
        <div className="sticky top-20 z-40 w-full bg-background/80 backdrop-blur-md border-y border-border/50 py-4 shadow-sm transition-all duration-300">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center">

                    {/* Search Input */}
                    <div className="relative w-full lg:w-96 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder={t("search_placeholder")}
                            className="pl-9 bg-background rounded-full border-border/60 focus-visible:ring-primary/20 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Filters Row */}
                    <div className="flex gap-2 w-full overflow-x-auto pb-2 lg:pb-0 scrollbar-hide items-center">

                        {/* Program Filter */}
                        <Select
                            value={searchParams.get("program") || "all"}
                            onValueChange={(val) => handleFilterChange("program", val)}
                        >
                            <SelectTrigger className="w-[180px] rounded-full bg-background border-border/60">
                                <SelectValue placeholder={t("program_label")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("Programs.all")}</SelectItem>
                                {PROGRAMS.map(p => (
                                    <SelectItem key={p} value={p}>{t(`Programs.${p}`)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Format Filter */}
                        <Select
                            value={searchParams.get("format") || "all"}
                            onValueChange={(val) => handleFilterChange("format", val)}
                        >
                            <SelectTrigger className="w-[160px] rounded-full bg-background border-border/60">
                                <SelectValue placeholder={t("format_label")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("Formats.all")}</SelectItem>
                                {STORY_FORMATS.map(f => (
                                    <SelectItem key={f} value={f}>{t(`Formats.${f}`)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Role Filter */}
                        <Select
                            value={searchParams.get("role") || "all"}
                            onValueChange={(val) => handleFilterChange("role", val)}
                        >
                            <SelectTrigger className="w-[160px] rounded-full bg-background border-border/60">
                                <SelectValue placeholder={t("role_label")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("Roles.all")}</SelectItem>
                                {STORY_ROLES.map(r => (
                                    <SelectItem key={r} value={r}>{t(`Roles.${r}`)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {hasFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10"
                            >
                                <X className="w-4 h-4 mr-1" />
                                <span className="hidden sm:inline">{t("clear")}</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}