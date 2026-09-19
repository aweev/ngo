import { Link } from '@/lib/navigation';
import { CalendarDays, MapPin } from 'lucide-react';
import type { PublicEvent } from '@/actions/public';
import { formatPublicDate } from '@/lib/i18n/format';

/**
 * Locale-aware event card for the homepage "Upcoming Events" strip and the
 * /public/events listing. Renders admin-managed data only — no placeholder
 * imagery, no fabricated details. Links via the locale-aware navigation Link
 * so `/[locale]` prefixing is always correct.
 */
export function EventCard({ event, locale }: { event: PublicEvent; locale: string }) {
    const place = [event.city, event.country].filter(Boolean).join(', ');

    return (
        <Link
            href={`/public/events/${event.slug}`}
            className="group flex flex-col rounded-2xl border border-border/50 bg-card p-6 hover:shadow-lg hover:border-primary/30 transition-all"
        >
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-2">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {formatPublicDate(event.start_date, locale)}
            </p>
            <h3 className="font-bold text-lg leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {event.title}
            </h3>
            {place && (
                <p className="mt-auto flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {place}
                </p>
            )}
        </Link>
    );
}
