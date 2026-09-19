import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPublicEvents } from "@/actions/public";

import { EventCard } from "@/components/events/event-card";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Events.Hub" });
    return {
        title: t("hero_title"),
        description: t("hero_subtitle")
    };
}

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Events.Hub" });

    // Upcoming published public events only (admin: /admin/events).
    // No fabricated entries — an intentional empty state when none exist.
    const events = (await getPublicEvents(24, locale)).data ?? [];

    return (
        <main className="bg-background min-h-screen pb-24">
            {/* Hero */}
            <section className="pt-20 pb-16 md:pt-28 md:pb-20 bg-muted/20 border-b border-border/50">
                <div className="container mx-auto px-4 md:px-6">
                    <span className="inline-flex items-center gap-2 text-primary font-bold tracking-widest uppercase text-sm pl-4 border-l-2 border-primary mb-4">
                        {t("badge")}
                    </span>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
                        {t("hero_title")}
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl">
                        {t("hero_subtitle")}
                    </p>
                </div>
            </section>

            {/* Listing */}
            <section className="container mx-auto px-4 md:px-6 pt-16">
                {events.length === 0 ? (
                    <div className="max-w-2xl mx-auto text-center py-24 space-y-4">
                        <h2 className="text-2xl font-serif font-bold">{t("empty_title")}</h2>
                        <p className="text-muted-foreground">{t("empty_subtitle")}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((e) => (
                            <EventCard key={e.id} event={e} locale={locale} />
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
