import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEvents } from "@/actions/events";
import { Plus, CalendarDays } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Events" });
    const tEnums = await getTranslations({ locale, namespace: "Manage.Enums" });
    const { data: events } = await getEvents();

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/events/new">
                            <Plus className="h-4 w-4" />
                            {t("schedule_event")}
                        </Link>
                    </Button>
                }
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("cols.title")}</TableHead>
                            <TableHead>{t("cols.type")}</TableHead>
                            <TableHead>{t("cols.datetime")}</TableHead>
                            <TableHead>{t("cols.attendees")}</TableHead>
                            <TableHead>{t("cols.status")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!events || events.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                                    {t("empty")}
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
                                    <TableCell className="capitalize text-xs">
                                        {tEnums.has(evt.type) ? tEnums(evt.type) : evt.type.replace('_', ' ')}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(evt.start_date).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">{t("registered", { count: evt.registered_count })}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">
                                            {tEnums.has(evt.status) ? tEnums(evt.status) : evt.status}
                                        </Badge>
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
