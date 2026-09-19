import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getWorkflowDefinitions, getWorkflowInstances } from "@/actions/workflows";
import { Plus, GitBranch } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
    const [{ data: definitions }, { data: instances }] = await Promise.all([
        getWorkflowDefinitions(),
        getWorkflowInstances(),
    ]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Workflows & Approvals"
                description="Design multi-step business workflows, approval chains, and task sequences."
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/workflows/new">
                            <Plus className="h-4 w-4" />
                            New Workflow
                        </Link>
                    </Button>
                }
            />

            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Workflow Templates</h3>
                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Workflow Name</TableHead>
                                <TableHead>Steps Count</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Version</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(!definitions || definitions.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                                        No workflow definitions created yet.
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
                                        <TableCell className="text-xs">{wf.steps?.length || 0} steps</TableCell>
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
