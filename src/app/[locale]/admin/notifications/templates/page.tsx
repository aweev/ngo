import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getNotificationTemplates } from "@/actions/notifications";
import { ArrowLeft, Bell, Plus } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function NotificationTemplatesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Notifications.templates" });
    const { data: templates } = await getNotificationTemplates();

    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/notifications">
                    <ArrowLeft className="h-4 w-4" /> {t("back")}
                </Link>
            </Button>
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/notifications/templates/new">
                            <Plus className="h-4 w-4" />
                            {t("new_template")}
                        </Link>
                    </Button>
                }
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("cols.name")}</TableHead>
                            <TableHead>{t("cols.channel")}</TableHead>
                            <TableHead>{t("cols.subject")}</TableHead>
                            <TableHead>{t("cols.system")}</TableHead>
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
                                        <Link href={`/admin/notifications/templates/${tpl.id}`} className="flex items-center gap-2 hover:underline">
                                            <Bell className="h-4 w-4 text-blue-500 shrink-0" />
                                            <span>{tpl.name}</span>
                                        </Link>
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
