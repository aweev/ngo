"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/manage/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createEvent } from "@/actions/events";
import type { EventStatus, EventType } from "@/types/domain/events";
import { ArrowLeft, CalendarDays, Loader2 } from "lucide-react";
import { Link } from "@/lib/navigation";

export default function NewEventPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<EventType>("in_person");
    const [status, setStatus] = useState<EventStatus>("draft");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [location, setLocation] = useState("");
    const [city, setCity] = useState("");
    const [virtualLink, setVirtualLink] = useState("");
    const [maxAttendees, setMaxAttendees] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function slugify(value: string): string {
        return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!title.trim() || !startDate) {
            setError("An event title and start date are required.");
            return;
        }
        setLoading(true);
        setError(null);
        const result = await createEvent({
            title: title.trim(),
            slug: slugify(title),
            description: description.trim() || null,
            type,
            status,
            start_date: new Date(startDate).toISOString(),
            end_date: endDate ? new Date(endDate).toISOString() : null,
            location: location.trim() || null,
            address: null,
            city: city.trim() || null,
            country: null,
            virtual_link: virtualLink.trim() || null,
            max_attendees: maxAttendees ? Number(maxAttendees) : null,
            cover_image_url: null,
            is_public: isPublic,
            project_id: null,
            campaign_id: null,
            created_by: null,
        });
        setLoading(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        router.push("/admin/events");
    }

    return (
        <div className="max-w-3xl space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/events">
                    <ArrowLeft className="h-4 w-4" /> Back to Events
                </Link>
            </Button>
            <PageHeader title="Schedule Event" description="Organize a workshop, webinar, or community outreach event." />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <CalendarDays className="h-4 w-4 text-purple-500" /> Event details
                        </CardTitle>
                        <CardDescription>Describe the event and when it takes place.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-1">
                            <label htmlFor="event-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event title</label>
                            <Input id="event-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Community Cleanup Day" />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="event-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                            <Textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will attendees experience?" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label htmlFor="event-start" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start date & time</label>
                                <Input id="event-start" required type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="event-end" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End date & time</label>
                                <Input id="event-end" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event type</label>
                                <Select value={type} onValueChange={(v) => setType(v as EventType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in_person">In person</SelectItem>
                                        <SelectItem value="virtual">Virtual</SelectItem>
                                        <SelectItem value="hybrid">Hybrid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                                <Select value={status} onValueChange={(v) => setStatus(v as EventStatus)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label htmlFor="event-location" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location</label>
                                <Input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Venue or address" />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="event-city" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</label>
                                <Input id="event-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label htmlFor="event-virtual" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Virtual link</label>
                                <Input id="event-virtual" value={virtualLink} onChange={(e) => setVirtualLink(e.target.value)} placeholder="https://..." />
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="event-capacity" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Max attendees</label>
                                <Input id="event-capacity" type="number" min="1" value={maxAttendees} onChange={(e) => setMaxAttendees(e.target.value)} placeholder="Unlimited" />
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <Checkbox checked={isPublic} onCheckedChange={(v) => setIsPublic(v === true)} />
                            Visible on the public website
                        </label>
                    </CardContent>
                </Card>
                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/events">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? "Saving..." : "Save event"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
