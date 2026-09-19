import { notFound } from "next/navigation";
import { PageHeader } from "@/components/manage/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AutomationRuleBuilder } from "@/components/admin/automation-rule-builder";
import { getAutomationRule, getAutomationExecutions } from "@/actions/automations";

export const dynamic = "force-dynamic";

export default async function AutomationRuleDetailPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { id } = await params;
    const [{ data: rule }, { data: executions }] = await Promise.all([
        getAutomationRule(id),
        getAutomationExecutions(id),
    ]);

    if (!rule) notFound();

    return (
        <div className="space-y-8">
            <PageHeader
                title={rule.name}
                description={`Trigger: ${rule.trigger_type} · ${rule.run_count} runs · Last run: ${rule.last_run_at ? new Date(rule.last_run_at).toLocaleString() : "never"}`}
            />

            <AutomationRuleBuilder
                ruleId={rule.id}
                initial={{
                    name: rule.name,
                    description: rule.description ?? "",
                    trigger_type: rule.trigger_type,
                    trigger_config: rule.trigger_config ?? {},
                    conditions: rule.conditions ?? [],
                    actions: rule.actions ?? [],
                }}
            />

            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Execution history
                </h3>
                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Started</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Error</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(!executions || executions.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">
                                        This rule has not executed yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                executions.map((exec) => (
                                    <TableRow key={exec.id}>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(exec.started_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={exec.status === "success" ? "default" : exec.status === "failure" ? "destructive" : "secondary"}
                                                className="capitalize"
                                            >
                                                {exec.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {exec.error_message ?? "—"}
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
