import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReports } from "@/actions/reporting";
import { Plus, FileBarChart } from "lucide-react";
import { Link } from "@/lib/navigation";
import { RunReportButton } from "@/components/admin/run-report-button";
import { ExportCsvButton } from "@/components/admin/export-csv-button";
import { IatiExportButton } from "@/components/admin/iati-export-button";

export const dynamic = "force-dynamic";

export default async function ReportingPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Reporting" });
    const { data: reports } = await getReports();

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <div className="flex gap-2">
                        <IatiExportButton />
                        <Button asChild className="gap-2">
                            <Link href="/admin/reporting/new">
                                <Plus className="h-4 w-4" />
                                {t("new_report")}
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
                            <TableHead>{t("cols.scope")}</TableHead>
                            <TableHead>{t("cols.sorting")}</TableHead>
                            <TableHead className="text-right">{t("cols.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!reports || reports.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                                    {t("empty")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            reports.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-semibold text-sm">
                                        <Link href={`/admin/reporting/${r.id}`} className="flex items-center gap-2 hover:underline">
                                            <FileBarChart className="h-4 w-4 text-indigo-500 shrink-0" />
                                            <span>{r.name}</span>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="capitalize text-xs font-mono">{r.entity_type}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{r.sort_field || "default"}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <ExportCsvButton reportId={r.id} />
                                            <RunReportButton reportId={r.id} />
                                        </div>
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
