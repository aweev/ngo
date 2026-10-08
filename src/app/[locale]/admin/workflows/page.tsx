import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getWorkflowDefinitions, getWorkflowInstances } from "@/actions/workflows";
import { Plus, GitBranch } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Workflows" });
    const [{ data: definitions }, { data: instances }] = await Promise.all([
        getWorkflowDefinitions(),
        getWorkflowInstances(),
    ]);

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/workflows/new">
                            <Plus className="h-4 w-4" />
                            {t("new_workflow")}
                        </Link>
                    </Button>
                }
            />

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("templates")}</h3>
                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("cols.name")}</TableHead>
                                <TableHead>{t("cols.steps")}</TableHead>
                                <TableHead>{t("cols.status")}</TableHead>
                                <TableHead>{t("cols.version")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(!definitions || definitions.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                                        {t("empty")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                definitions.map((wf) => (
                                    <TableRow key={wf.id}>
                                        <TableCell className="font-semibold text-sm">
                                            <Link href={`/admin/workflows/${wf.id}`} className="flex items-center gap-2 hover:underline">
                                                <GitBranch className="h-4 w-4 text-blue-500 shrink-0" />
                                                <span>{wf.name}</span>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-xs">{t("steps_count", { count: wf.steps?.length || 0 })}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">{wf.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-mono">v{wf.version}</TableCell>
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
