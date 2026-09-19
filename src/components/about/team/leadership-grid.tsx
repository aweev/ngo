"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Linkedin, Quote } from "lucide-react";
import { Link } from "@/lib/navigation";
import { dignifiedReveal, staggeredContainer } from "@/lib/animations";
import { TeamMemberViewModel } from "@/types/domain-adapters";

interface LeadershipGridProps {
    leaders: TeamMemberViewModel[];
}

export function LeadershipGrid({ leaders }: LeadershipGridProps) {
    const t = useTranslations("Team.Leadership");

    if (!leaders || leaders.length === 0) return null;

    const edIndex = leaders.findIndex((leader) => /executive director|chief executive|director general/i.test(leader.role));
    const ed = edIndex >= 0 ? leaders[edIndex] : leaders[0];
    const others = leaders.filter((_, index) => index !== (edIndex >= 0 ? edIndex : 0));

    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-4">
                <motion.h2
                    variants={dignifiedReveal}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="text-4xl font-serif font-bold text-foreground mb-16 text-center"
                >
                    {t("title")}
                </motion.h2>

                {/* Executive Director Feature */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="bg-muted/30 rounded-[2.5rem] p-8 md:p-12 mb-16 border border-border/50"
                >
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                        <div className="w-full md:w-1/3">
                            <div className="relative rounded-2xl overflow-hidden shadow-xl" style={{ aspectRatio: "3 / 4" }}>
                                <Image
                                    src={ed.imageSrc}
                                    alt={ed.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-2/3 space-y-6">
                            <div>
                                <h3 className="text-3xl font-serif font-bold text-foreground">{ed.name}</h3>
                                <p className="text-primary font-medium tracking-wide uppercase text-sm mt-1">{ed.role}</p>
                            </div>

                            {/* Optional Quote Logic */}
                            <div className="relative pl-8 border-l-4 border-accent/50 py-2">
                                <Quote className="absolute top-0 left-2 w-6 h-6 text-accent/20 -translate-x-full" />
                                <p className="text-xl md:text-2xl font-serif italic text-muted-foreground">
                                    &quot;{t("ed_quote")}&quot;
                                </p>
                            </div>

                            <p className="text-muted-foreground leading-relaxed">{ed.bio}</p>

                            {ed.linkedin && (
                                    <Link href={ed.linkedin} aria-label={`${ed.name} on LinkedIn`} className="inline-flex p-2 text-muted-foreground hover:text-[#0077b5] transition-colors">
                                    <Linkedin className="w-6 h-6" />
                                </Link>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Other Leadership */}
                <motion.div
                    variants={staggeredContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="grid md:grid-cols-2 gap-8"
                >
                    {others.map((leader) => (
                        <motion.div key={leader.id} variants={dignifiedReveal} className="flex gap-6 items-start p-6 rounded-2xl hover:bg-muted/50 transition-colors">
                            <div className="w-24 h-24 relative rounded-full overflow-hidden shrink-0 border-2 border-border">
                                <Image
                                    src={leader.imageSrc}
                                    alt={leader.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-bold font-serif">{leader.name}</h4>
                                <p className="text-primary text-xs font-bold uppercase tracking-wider">{leader.role}</p>
                                <p className="text-sm text-muted-foreground line-clamp-3">{leader.bio}</p>
                                {leader.linkedin && (
                                    <Link href={leader.linkedin} aria-label={`${leader.name} on LinkedIn`} className="inline-block pt-1 text-muted-foreground hover:text-[#0077b5] transition-colors">
                                        <Linkedin className="w-4 h-4" />
                                    </Link>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}