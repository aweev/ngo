"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Heart, CalendarDays } from "lucide-react";
import { Link } from "@/lib/navigation";
import { ProjectDeepDiveViewModel } from "@/types/domain-adapters";
import { ProgramCategory, PROGRAM_THEMES } from "@/lib/program-themes";
import { donationPath, volunteerPath } from "@/lib/program-routes";

interface ActionSidebarProps {
    project: ProjectDeepDiveViewModel;
    category: ProgramCategory;
}

export function ActionSidebar({ project, category }: ActionSidebarProps) {
    const t = useTranslations("Project.Sidebar");
    const theme = PROGRAM_THEMES[category];

    return (
        <div className="sticky top-24 space-y-6">

            {/* 1. Donate Card (Priority 1) */}
            {project.status === 'Active' || project.status === 'Planning' ? (
                <div className={`bg-card rounded-2xl p-6 shadow-xl border-2 ${theme.border}`}>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                        <Heart className="w-6 h-6 fill-current" />
                    </div>
                    <h3 className="text-xl font-bold font-serif mb-2">{t("donate_title")}</h3>
                    {project.funding && (
                        <p className="text-muted-foreground text-sm mb-6">
                            {t("donate_desc", { goal: project.funding.goal.toLocaleString() })}
                        </p>
                    )}
                    <Button asChild size="lg" className="w-full rounded-xl font-bold shadow-lg shadow-primary/20">
                        <Link href={donationPath({ project: project.id })}>
                            {t("donate_btn")}
                        </Link>
                    </Button>
                </div>
            ) : null}

            {/* 2. Volunteer Card (Priority 2) */}
            {project.volunteerNeeds && (
                <div className="bg-background rounded-2xl p-6 border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <CalendarDays className="w-5 h-5 text-muted-foreground" />
                        <h3 className="font-bold">{t("volunteer_title")}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                        {t("volunteer_desc", { count: project.volunteerNeeds })}
                    </p>
                    <Button asChild variant="outline" className="w-full rounded-xl">
                        <Link href={volunteerPath({ project: project.id })}>
                            {t("volunteer_btn")}
                        </Link>
                    </Button>
                </div>
            )}

            {/* 3. Contact / Lead */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image
                        src={project.lead.avatar}
                        alt={project.lead.name}
                        fill
                        className="object-cover"
                    />
                </div>
                <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">{t("lead_label")}</p>
                    <p className="font-medium text-sm">{project.lead.name}</p>
                </div>
            </div>

        </div>
    );
}