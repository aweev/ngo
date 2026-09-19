import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getNotificationTemplates } from "@/actions/notifications";
import { Plus, Bell } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
    const { data: templates } = await getNotificationTemplates();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Notifications & Templates"
                description="Manage automated message templates for email, SMS, push, and in-app alerts."
                action={
                    <div className="flex gap-2">
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/admin/notifications/templates">
                                <Bell className="h-4 w-4" />
                                Templates
                            </Link>
                        </Button>
                        <Button asChild className="gap-2">
                            <Link href="/admin/notifications/templates/new">
                                <Plus className="h-4 w-4" />
                                New Template
                            </Link>
                        </Button>
                    </div>
                }
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Template Name</TableHead>
                            <TableHead>Channel</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>System Template</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!templates || templates.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                                    No notification templates created yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            templates.map((tpl) => (
                                <TableRow key={tpl.id}>
                                    <TableCell className="font-semibold text-sm">
                                        <div className="flex items-center gap-2">
                                            <Bell className="h-4 w-4 text-blue-500 shrink-0" />
                                            <span>{tpl.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="uppercase text-xs font-mono">{tpl.channel}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{tpl.subject || "N/A"}</TableCell>
                                    <TableCell>
                                        <Badge variant={tpl.is_system ? "secondary" : "outline"}>
                                            {tpl.is_system ? "System" : "Custom"}
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
