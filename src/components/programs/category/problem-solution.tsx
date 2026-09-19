"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { ProgramCategory, PROGRAM_THEMES } from "@/lib/program-themes";

interface ProblemSolutionProps {
    category: ProgramCategory;
    challengeText: string;
    solutionText: string;
}

export function ProblemSolution({ category, challengeText, solutionText }: ProblemSolutionProps) {
    const t = useTranslations("Programs.Category.ProblemSolution");
    const theme = PROGRAM_THEMES[category];

    return (
        <section className="w-full">
            <div className="grid md:grid-cols-2">
                {/* Challenge Column (Gray/Muted) */}
                <div className="bg-muted/40 p-12 md:p-24 flex flex-col justify-center">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="max-w-md ml-auto"
                    >
                        <div className="flex items-center gap-3 mb-6 text-muted-foreground">
                            <AlertCircle className="w-6 h-6" />
                            <h3 className="text-lg font-bold uppercase tracking-widest">{t("challenge_title")}</h3>
                        </div>
                        <p className="text-2xl md:text-3xl font-serif text-muted-foreground leading-relaxed opacity-80">
                            &quot;{challengeText}&quot;
                        </p>
                    </motion.div>
                </div>

                {/* Solution Column (White/Themed) */}
                <div className="bg-background p-12 md:p-24 flex flex-col justify-center border-t md:border-t-0 md:border-l border-border relative overflow-hidden">
                    {/* Background Hint */}
                    <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl ${theme.gradient} opacity-20 blur-3xl`} />

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="max-w-md mr-auto relative z-10"
                    >
                        <div className={`flex items-center gap-3 mb-6 ${theme.primary}`}>
                            <CheckCircle2 className="w-6 h-6" />
                            <h3 className="text-lg font-bold uppercase tracking-widest">{t("solution_title")}</h3>
                        </div>
                        <p className="text-xl md:text-2xl leading-relaxed text-foreground font-medium">
                            {solutionText}
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}