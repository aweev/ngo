import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getReports } from "@/actions/reporting";
import { Plus, FileBarChart } from "lucide-react";
import { Link } from "@/lib/navigation";
import { RunReportButton } from "@/components/admin/run-report-button";

export const dynamic = "force-dynamic";

export default async function ReportingPage() {
    const { data: reports } = await getReports();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reports & Export Engine"
                description="Build custom analytical queries, generate PDF/CSV audit reports, and schedule exports."
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/reporting/new">
                            <Plus className="h-4 w-4" />
                            Build Report
                        </Link>
                    </Button>
                }
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Report Name</TableHead>
                            <TableHead>Entity Scope</TableHead>
                            <TableHead>Sorting</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!reports || reports.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                                    No custom report definitions created yet.
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
                                        <RunReportButton reportId={r.id} />
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
