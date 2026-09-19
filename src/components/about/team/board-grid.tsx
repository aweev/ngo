"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { TeamMemberViewModel } from "@/types/domain-adapters";

interface BoardGridProps {
    members: TeamMemberViewModel[];
}

export function BoardGrid({ members }: BoardGridProps) {
    const t = useTranslations("Team.Board");
    const [selectedMember, setSelectedMember] = useState<TeamMemberViewModel | null>(null);

    // Guard clause for empty state
    if (!members || members.length === 0) return null;

    return (
        <section className="py-24 bg-muted/10">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-serif font-bold text-foreground">{t("title")}</h2>
                    <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {members.map((member) => (
                        <motion.button
                            key={member.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="group cursor-pointer"
                            onClick={() => setSelectedMember(member)}
                            type="button"
                            aria-label={`View profile for ${member.name}`}
                        >
                            <div className="relative aspect-square overflow-hidden rounded-xl mb-4 bg-muted">
                                <Image
                                    src={member.imageSrc}
                                    alt={member.name}
                                    fill
                                    className="object-cover transition-all duration-500 filter grayscale group-hover:grayscale-0 group-hover:scale-105"
                                />
                            </div>
                            <h3 className="text-lg font-bold text-foreground">{member.name}</h3>

                            {/* FIX: Render role directly from backend data. No 'any' casting needed. */}
                            <p className="text-primary text-xs font-bold uppercase tracking-wider mb-1">
                                {member.role}
                            </p>

                            {member.affiliation && (
                                <p className="text-xs text-muted-foreground">
                                    {t("affiliation_label")} {member.affiliation}
                                </p>
                            )}
                        </motion.button>
                    ))}
                </div>

                {/* Detail Modal */}
                <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-serif font-bold">
                                {selectedMember?.name}
                            </DialogTitle>
                            <p className="text-primary font-medium text-sm uppercase tracking-wide">
                                {selectedMember?.role}
                            </p>
                        </DialogHeader>
                        <div className="flex gap-6 mt-4">
                            <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-muted">
                                {selectedMember && (
                                    <Image
                                        src={selectedMember.imageSrc}
                                        alt={selectedMember.name}
                                        fill
                                        className="object-cover"
                                    />
                                )}
                            </div>
                            <DialogDescription className="text-base leading-relaxed">
                                {selectedMember?.bio}
                            </DialogDescription>
                        </div>
                        {selectedMember?.affiliation && (
                            <div className="mt-4 pt-4 border-t border-border">
                                <p className="text-sm text-muted-foreground font-medium">
                                    {t("affiliation_label")} {selectedMember.affiliation}
                                </p>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </section>
    );
}