"use client";

import { Link } from "@/lib/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { MapPin, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { ProjectViewModel } from "@/types/domain-adapters";
import { ProgramCategory, PROGRAM_THEMES } from "@/lib/program-themes";
import { staggeredContainer, dignifiedReveal } from "@/lib/animations";
import { projectPath } from "@/lib/program-routes";

interface ProjectsGridProps {
    projects: ProjectViewModel[];
    category: ProgramCategory;
}

export function ProjectsGrid({ projects, category }: ProjectsGridProps) {
    const t = useTranslations("Programs.Category.Projects");
    const theme = PROGRAM_THEMES[category];

    // Badge Colors Logic
    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'active' || s === 'recruiting') return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
        if (s === 'completed') return 'bg-blue-500/10 text-blue-600 border-blue-200';
        return 'bg-muted text-muted-foreground border-border';
    };

    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-4">
                <div className="mb-16">
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                        {t("title")}
                    </h2>
                    <p className="text-muted-foreground max-w-2xl text-lg">
                        {t("subtitle")}
                    </p>
                </div>

                <motion.div
                    variants={staggeredContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                    {projects.map((project) => (
                        <motion.div key={project.id} variants={dignifiedReveal} className="h-full">
                            <Link href={projectPath(category, project.slug)} className="group block h-full">
                                <article className={`h-full flex flex-col bg-card rounded-[2rem] overflow-hidden border border-border/60 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${theme.shadow}`}>
                                    <div className="relative aspect-[16/10] overflow-hidden">
                                        <Image
                                            src={project.imageSrc}
                                            alt={project.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />

                                        <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md border ${getStatusColor(project.status)}`}>
                                            {project.status}
                                        </span>
                                    </div>

                                    <div className="p-6 lg:p-8 flex flex-col flex-grow">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                                            <MapPin className="w-3 h-3" />
                                            {project.location}
                                        </div>

                                        <h3 className={`text-xl font-serif font-bold mb-3 group-hover:${theme.primary} transition-colors`}>
                                            {project.title}
                                        </h3>

                                        <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-grow line-clamp-3">
                                            {project.summary}
                                        </p>

                                        <div className={`flex items-center text-sm font-bold ${theme.primary} mt-auto`}>
                                            {t("view_project")}
                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </article>
                            </Link>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}