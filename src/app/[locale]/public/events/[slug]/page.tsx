import { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, MapPin, Tag, Users, Video } from "lucide-react";

import { Link } from "@/lib/navigation";
import { getPublicEventBySlug } from "@/actions/public";
import { formatPublicDate, formatPublicDateTime, formatPublicNumber } from "@/lib/i18n/format";

type Props = {
    params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale, slug } = await params;
    const t = await getTranslations({ locale, namespace: "Events.Detail" });
    const { data: event } = await getPublicEventBySlug(slug, locale);

    if (!event) {
        return { title: t("not_found") };
    }

    return {
        title: event.title,
        description: event.description ?? undefined,
    };
}

export default async function EventDetailPage({ params }: Props) {
    const { locale, slug } = await params;
    const t = await getTranslations({ locale, namespace: "Events.Detail" });

    // Published + public events only (admin: /admin/events). Rendered data
    // is admin-managed — nothing is fabricated when fields are missing.
    const { data: event } = await getPublicEventBySlug(slug, locale);
    if (!event) notFound();

    const place = [event.city, event.country].filter(Boolean).join(", ");
    const venue = event.location || place || null;
    const isVirtual = Boolean(event.virtual_link);
    const eventType = event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : null;

    return (
        <main className="bg-background min-h-screen pb-24">
            {/* Cover image — rendered only when the admin set one (no placeholders) */}
            {event.cover_image_url && (
                <div className="relative h-[40vh] md:h-[50vh] w-full">
                    <Image
                        src={event.cover_image_url}
                        alt={event.title}
                        fill
                        priority
                        className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                </div>
            )}

            <section className={`container mx-auto px-4 md:px-6 max-w-5xl ${event.cover_image_url ? "-mt-16 relative z-10" : "pt-12 md:pt-16"}`}>
                <Link
                    href="/public/events"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors mb-6"
                >
                    <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
                    {t("back_to_events")}
                </Link>

                <span className="inline-flex items-center gap-2 text-primary font-bold tracking-widest uppercase text-sm pl-4 border-l-2 border-primary mb-4">
                    {t("badge")}
                </span>
                <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-6 leading-tight max-w-3xl">
                    {event.title}
                </h1>

                {/* Quick facts */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card px-4 py-1.5 font-medium">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" aria-hidden />
                        {formatPublicDate(event.start_date, locale)}
                    </span>
                    {venue && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card px-4 py-1.5 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
                            {venue}
                        </span>
                    )}
                    {isVirtual && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card px-4 py-1.5 font-medium">
                            <Video className="h-3.5 w-3.5 text-primary" aria-hidden />
                            {t("virtual_label")}
                        </span>
                    )}
                    {eventType && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card px-4 py-1.5 font-medium">
                            <Tag className="h-3.5 w-3.5 text-primary" aria-hidden />
                            {eventType}
                        </span>
                    )}
                </div>
            </section>

            <section className="container mx-auto px-4 md:px-6 max-w-5xl pt-12 md:pt-16">
                <div className="grid lg:grid-cols-3 gap-10">
                    {/* Details — rendered only when the admin wrote them */}
                    <div className="lg:col-span-2">
                        {event.description && (
                            <>
                                <h2 className="text-2xl font-serif font-bold mb-4">{t("details_title")}</h2>
                                <p className="prose prose-lg max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {event.description}
                                </p>
                            </>
                        )}
                    </div>

                    {/* Facts sidebar */}
                    <aside className="lg:col-span-1">
                        <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-6 lg:sticky lg:top-24">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-muted text-primary shrink-0">
                                    <CalendarDays className="h-4 w-4" aria-hidden />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("date_label")}</p>
                                    <p className="font-semibold">{formatPublicDate(event.start_date, locale)}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-muted text-primary shrink-0">
                                    <Clock className="h-4 w-4" aria-hidden />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("time_label")}</p>
                                    <p className="font-semibold">
                                        {formatPublicDateTime(event.start_date, locale, { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                            </div>

                            {(venue || isVirtual) && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-muted text-primary shrink-0">
                                        {isVirtual ? <Video className="h-4 w-4" aria-hidden /> : <MapPin className="h-4 w-4" aria-hidden />}
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("location_label")}</p>
                                        <p className="font-semibold">{isVirtual ? t("virtual_label") : venue}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {isVirtual ? t("virtual_event_note") : t("in_person_note")}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {(event.max_attendees != null || event.registered_count > 0) && (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-muted text-primary shrink-0">
                                        <Users className="h-4 w-4" aria-hidden />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                                            {event.max_attendees != null ? t("capacity_label") : t("registered_label")}
                                        </p>
                                        <p className="font-semibold">
                                            {event.max_attendees != null
                                                ? `${formatPublicNumber(event.registered_count, locale)} / ${formatPublicNumber(event.max_attendees, locale)}`
                                                : formatPublicNumber(event.registered_count, locale)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {event.virtual_link && (
                                <a
                                    href={event.virtual_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-bold px-6 py-3 hover:bg-primary/90 transition-colors"
                                >
                                    {t("register")}
                                </a>
                            )}
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}