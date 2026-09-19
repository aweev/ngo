import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAutomationRules } from "@/actions/automations";
import { Plus, Zap, Play, CheckCircle2, AlertCircle } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
    const { data: rules } = await getAutomationRules();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Automations & IFTTT Engine"
                description="Configure automated rules, triggers, conditions, and actions for your organization."
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/automations/new">
                            <Plus className="h-4 w-4" />
                            Create Rule
                        </Link>
                    </Button>
                }
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rule Name</TableHead>
                            <TableHead>Trigger</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Executions</TableHead>
                            <TableHead>Last Run</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!rules || rules.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                                    No automation rules defined yet. Click &quot;Create Rule&quot; to set up your first IFTTT workflow.
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
                                            {rule.is_enabled ? "Active" : "Disabled"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">{rule.run_count} runs</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {rule.last_run_at ? new Date(rule.last_run_at).toLocaleString() : "Never"}
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
