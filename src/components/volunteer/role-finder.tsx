"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, MapPin, Clock, Briefcase, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "@/lib/navigation";
import { VolunteerRole } from "@/types/domain-adapters";
import { motion, AnimatePresence } from "framer-motion";

interface RoleFinderProps {
    roles: VolunteerRole[];
}

export function RoleFinder({ roles }: RoleFinderProps) {
    const t = useTranslations("Volunteer.Roles");
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [catFilter, setCatFilter] = useState("all");

    // Client-side filtering
    const filteredRoles = roles.filter(role => {
        const matchesSearch = role.title.toLowerCase().includes(search.toLowerCase()) ||
            role.description.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === "all" || role.type === typeFilter;
        const matchesCat = catFilter === "all" || role.category === catFilter;
        return matchesSearch && matchesType && matchesCat;
    });

    return (
        <section id="role-finder" className="py-24 bg-muted/20">
            <div className="container mx-auto px-4">

                <div className="text-center mb-12">
                    <h2 className="text-4xl font-serif font-bold text-foreground mb-4">{t("title")}</h2>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>

                <div className="bg-background rounded-2xl p-4 shadow-sm border border-border mb-12 flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search roles..."
                            className="pl-10 bg-muted/30 border-0"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[140px] rounded-lg bg-muted/30 border-0">
                                <SelectValue placeholder={t("filters.type")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("filters.all")}</SelectItem>
                                <SelectItem value="Remote">Remote</SelectItem>
                                <SelectItem value="On-Site">On-Site</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={catFilter} onValueChange={setCatFilter}>
                            <SelectTrigger className="w-[160px] rounded-lg bg-muted/30 border-0">
                                <SelectValue placeholder={t("filters.category")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("filters.all")}</SelectItem>
                                <SelectItem value="Mentorship">Mentorship</SelectItem>
                                <SelectItem value="Events">Events</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px]">
                    <AnimatePresence mode="popLayout">
                        {filteredRoles.map((role) => (
                            <motion.div
                                key={role.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-card rounded-2xl p-6 border border-border/60 hover:border-primary/40 hover:shadow-md transition-all flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className="inline-flex px-3 py-1 rounded-full bg-muted text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {role.category}
                                    </span>
                                    {role.isUrgent && (
                                        <span className="inline-flex px-3 py-1 rounded-full bg-rose-100 text-rose-600 text-xs font-bold uppercase tracking-wider animate-pulse">
                                            {t("card.urgent")}
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold font-serif text-foreground mb-2">{role.title}</h3>

                                <div className="space-y-2 mb-6 flex-grow">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MapPin className="w-4 h-4" />
                                        {role.location}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Briefcase className="w-4 h-4" />
                                        {role.type}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        {role.commitment}
                                    </div>
                                </div>

                                <Button asChild className="w-full rounded-xl">
                                    <Link href={`/auth/register?role=${role.id}`}>
                                        {t("card.apply")}
                                    </Link>
                                </Button>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredRoles.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <Filter className="w-12 h-12 mb-4 opacity-20" />
                            <p className="text-lg font-medium">{t("empty.title")}</p>
                            <p className="text-sm">{t("empty.desc")}</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}