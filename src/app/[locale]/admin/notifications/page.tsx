import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getNotificationTemplates } from "@/actions/notifications";
import { Plus, Bell } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Notifications" });
    const { data: templates } = await getNotificationTemplates();

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <div className="flex gap-2">
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/admin/notifications/templates">
                                <Bell className="h-4 w-4" />
                                {t("templates")}
                            </Link>
                        </Button>
                        <Button asChild className="gap-2">
                            <Link href="/admin/notifications/templates/new">
                                <Plus className="h-4 w-4" />
                                {t("new_template")}
                            </Link>
                        </Button>
                    </div>
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
                                    {t("empty")}
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
                                    <TableCell className="text-xs text-muted-foreground">{tpl.subject || t("not_available")}</TableCell>
                                    <TableCell>
                                        <Badge variant={tpl.is_system ? "secondary" : "outline"}>
                                            {tpl.is_system ? t("system") : t("custom")}
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
