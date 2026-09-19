"use client";

import { useTranslations, useFormatter } from "next-intl";
import { motion } from "framer-motion";
import { ProgramCategory, PROGRAM_THEMES } from "@/lib/program-themes";
import { ProjectDeepDiveViewModel } from "@/types/domain-adapters";

interface ProgressTrackerProps {
    project: ProjectDeepDiveViewModel;
    category: ProgramCategory;
}

export function ProgressTracker({ project, category }: ProgressTrackerProps) {
    const t = useTranslations("Project.Progress");
    const format = useFormatter();
    const theme = PROGRAM_THEMES[category];

    // Calculate Funding %
    const fundingPercent = project.funding
        ? Math.min(100, Math.round((project.funding.current / project.funding.goal) * 100))
        : 0;

    // Phases Logic
    const phases = ["Planning", "Active", "Completed"];
    const currentPhaseIndex = phases.indexOf(project.status) === -1 ? 0 : phases.indexOf(project.status);

    return (
        <div className="bg-card border border-border/60 rounded-3xl p-8 mb-12 shadow-sm">
            <h3 className="text-xl font-serif font-bold mb-8">{t("title")}</h3>

            {/* 1. Funding Bar (If applicable) */}
            {project.funding && (
                <div className="mb-10">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <span className="text-3xl font-bold text-foreground">
                                {format.number(project.funding.current, { style: 'currency', currency: project.funding.currency, maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-muted-foreground text-sm ml-2">
                                raised of {format.number(project.funding.goal, { style: 'currency', currency: project.funding.currency, maximumFractionDigits: 0 })}
                            </span>
                        </div>
                        <span className={`font-bold ${theme.primary}`}>{fundingPercent}%</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${fundingPercent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full ${theme.bg.replace('/50', '')} bg-gradient-to-r ${theme.gradient.replace('/20', '')}`}
                            style={{ backgroundColor: 'currentColor' }} // Fallback
                        />
                    </div>
                </div>
            )}

            {/* 2. Phases Timeline */}
            <div className="relative flex justify-between items-center">
                {/* Connecting Line */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -translate-y-1/2" />
                <div
                    className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 transition-all duration-1000"
                    style={{ width: `${(currentPhaseIndex / (phases.length - 1)) * 100}%` }}
                />

                {phases.map((phase, index) => {
                    const isCompleted = index <= currentPhaseIndex;
                    const isCurrent = index === currentPhaseIndex;

                    return (
                        <div key={phase} className="flex flex-col items-center gap-3 bg-card px-2">
                            <div className={`w-4 h-4 rounded-full border-2 transition-colors ${isCompleted
                                    ? `bg-primary border-primary`
                                    : "bg-muted border-muted-foreground"
                                }`} />
                            <span className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? "text-primary" : "text-muted-foreground"
                                }`}>
                                {phase}
                                {/* Mapping simplistic phase names to translations if needed */}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}