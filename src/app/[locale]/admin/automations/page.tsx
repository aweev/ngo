import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAutomationRules } from "@/actions/automations";
import { TemplateGallery } from "./template-gallery";
import { Plus, Zap, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AutomationsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Automations" });
    const tCommon = await getTranslations({ locale, namespace: "Admin.Common" });
    const { data: rules } = await getAutomationRules();

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/automations/new">
                            <Plus className="h-4 w-4" />
                            {t("create_rule")}
                        </Link>
                    </Button>
                }
            />

            <TemplateGallery />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("cols.name")}</TableHead>
                            <TableHead>{t("cols.trigger")}</TableHead>
                            <TableHead>{t("cols.status")}</TableHead>
                            <TableHead>{t("cols.executions")}</TableHead>
                            <TableHead>{t("cols.last_run")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!rules || rules.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                                    {t("empty")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell className="font-semibold text-sm">
                                        <Link href={`/admin/automations/${rule.id}`} className="flex items-center gap-2 hover:underline">
                                            <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                                            <span>{rule.name}</span>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="capitalize text-xs font-mono">{rule.trigger_type}</TableCell>
                                    <TableCell>
                                        <Badge variant={rule.is_enabled ? "default" : "secondary"}>
                                            {rule.is_enabled ? t("status_active") : t("status_disabled")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">{t("runs", { count: rule.run_count })}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {rule.last_run_at ? new Date(rule.last_run_at).toLocaleString() : tCommon("never")}
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
