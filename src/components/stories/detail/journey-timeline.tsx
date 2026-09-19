"use client";

import { useTranslations } from "next-intl";
import { StoryTimelineEvent } from "@/types/domain-adapters";

export function JourneyTimeline({ events }: { events: StoryTimelineEvent[] }) {
    const t = useTranslations("Stories.Detail.Timeline");

    if (!events || events.length === 0) return null;

    return (
        <div className="bg-muted/30 p-8 rounded-2xl border border-border/50 h-fit sticky top-24">
            <h3 className="text-xl font-serif font-bold mb-6">{t("title")}</h3>

            <div className="space-y-8 relative">
                {/* Vertical Line */}
                <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-border" />

                {events.map((event, index) => (
                    <div key={index} className="relative pl-10">
                        <div className="absolute left-0 top-1.5 w-7 h-7 rounded-full bg-background border-4 border-muted-foreground/20 flex items-center justify-center z-10">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                        </div>

                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                            {event.year}
                        </span>
                        <h4 className="text-sm font-bold text-foreground mt-1">
                            {event.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {event.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}