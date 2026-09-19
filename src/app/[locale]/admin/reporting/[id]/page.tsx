import { notFound } from "next/navigation";
import { PageHeader } from "@/components/manage/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RunReportButton } from "@/components/admin/run-report-button";
import { getReport, getReportSnapshots } from "@/actions/reporting";
import { ReportEditForm } from "./report-edit-form";

export const dynamic = "force-dynamic";

export default async function ReportDetailPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { id } = await params;
    const [{ data: report }, { data: snapshots }] = await Promise.all([
        getReport(id),
        getReportSnapshots(id),
    ]);

    if (!report) notFound();

    return (
        <div className="space-y-8">
            <PageHeader
                title={report.name}
                description={`Source: ${report.entity_type} · ${snapshots?.length ?? 0} snapshots`}
                action={<RunReportButton reportId={report.id} />}
            />

            <ReportEditForm report={report} />

            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Snapshots
                </h3>
                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Snapshot</TableHead>
                                <TableHead>Rows</TableHead>
                                <TableHead>Generated</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(!snapshots || snapshots.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">
                                        No snapshots yet. Run the report to capture the first one.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                snapshots.map((snap) => (
                                    <TableRow key={snap.id}>
                                        <TableCell className="text-sm font-medium">{snap.name ?? snap.id.slice(0, 8)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono">
                                                {snap.row_count} rows
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(snap.generated_at).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
