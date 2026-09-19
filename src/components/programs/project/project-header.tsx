"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import { ChevronRight, MapPin, Calendar, User } from "lucide-react";
import { useTranslations, useFormatter } from "next-intl";
import { dignifiedReveal } from "@/lib/animations";
import { ProgramCategory, PROGRAM_THEMES } from "@/lib/program-themes";
import { ProjectDeepDiveViewModel } from "@/types/domain-adapters";
import { programCategoryPath, programsPath } from "@/lib/program-routes";

interface ProjectHeaderProps {
    project: ProjectDeepDiveViewModel;
    category: ProgramCategory;
}

export function ProjectHeader({ project, category }: ProjectHeaderProps) {
    const t = useTranslations("Project");
    const format = useFormatter();
    const theme = PROGRAM_THEMES[category];

    // Status Badge Logic
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Active': return "bg-emerald-500 text-white border-emerald-400";
            case 'Recruiting': return "bg-amber-500 text-white border-amber-400";
            case 'Completed': return "bg-blue-500 text-white border-blue-400";
            default: return "bg-gray-500 text-white border-gray-400";
        }
    };

    return (
        <section className="relative h-[70vh] min-h-[500px] flex items-end pb-12 overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src={project.imageSrc}
                    alt={project.title}
                    fill
                    className="object-cover"
                    priority
                />
                {/* Gradient Overlays */}
                <div className={`absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent`} />
                <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} mix-blend-multiply opacity-60`} />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    variants={dignifiedReveal}
                    initial="hidden"
                    animate="visible"
                    className="max-w-4xl"
                >
                    {/* Breadcrumbs */}
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-6 font-medium">
                        <Link href={programsPath()} className="hover:text-primary transition-colors">Programs</Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link href={programCategoryPath(category)} className={`hover:text-primary transition-colors capitalize`}>
                            {category.replace('-', ' ')}
                        </Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-foreground">{project.title}</span>
                    </div>

                    {/* Title & Status */}
                    <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider border shadow-sm ${getStatusStyle(project.status)}`}>
                            {t(`Status.${project.status.toLowerCase()}`)}
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground mb-8 leading-tight">
                        {project.title}
                    </h1>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-foreground/90 bg-background/40 backdrop-blur-md p-6 rounded-2xl border border-white/20 inline-block">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-background/50 ${theme.primary}`}>
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider opacity-70">Location</p>
                                <p className="font-semibold">{project.location}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-background/50 ${theme.primary}`}>
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider opacity-70">Duration</p>
                                <p className="font-semibold">
                                    {project.startDate ? format.dateTime(new Date(project.startDate), { month: 'short', year: 'numeric' }) : 'Not specified'} -
                                    {project.endDate ? format.dateTime(new Date(project.endDate), { month: 'short', year: 'numeric' }) : 'Ongoing'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-background/50 ${theme.primary}`}>
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wider opacity-70">Lead</p>
                                <p className="font-semibold">{project.lead.name}</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}