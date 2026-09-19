import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEvents } from "@/actions/events";
import { Plus, CalendarDays } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
    const { data: events } = await getEvents();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Events & Calendar"
                description="Organize workshops, webinars, community outreach, and volunteer events."
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/events/new">
                            <Plus className="h-4 w-4" />
                            Schedule Event
                        </Link>
                    </Button>
                }
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Event Title</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Attendees</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!events || events.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                                    No upcoming events scheduled.
                                </TableCell>
                            </TableRow>
                        ) : (
                            events.map((evt) => (
                                <TableRow key={evt.id}>
                                    <TableCell className="font-semibold text-sm">
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4 text-purple-500 shrink-0" />
                                            <span>{evt.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="capitalize text-xs">{evt.type.replace('_', ' ')}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(evt.start_date).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">{evt.registered_count} registered</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">{evt.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
