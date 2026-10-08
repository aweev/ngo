import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkflowBuilder } from "@/components/admin/workflow-builder";
import { getWorkflowDefinition, getWorkflowInstances } from "@/actions/workflows";

export const dynamic = "force-dynamic";

export default async function WorkflowDetailPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Workflows.Detail" });
    const [{ data: definition }, { data: instances }] = await Promise.all([
        getWorkflowDefinition(id),
        getWorkflowInstances({ definitionId: id }),
    ]);

    if (!definition) notFound();

    return (
        <div className="space-y-8">
            <PageHeader
                title={definition.name}
                description={t("version_desc", { version: definition.version, steps: definition.steps?.length ?? 0, status: definition.status })}
            />

            <WorkflowBuilder
                definitionId={definition.id}
                initial={{
                    name: definition.name,
                    slug: definition.slug,
                    description: definition.description ?? "",
                    status: definition.status,
                    trigger_config: definition.trigger_config ?? {},
                    steps: definition.steps ?? [],
                }}
            />

            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("instances_title")}
                </h3>
                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("cols.started")}</TableHead>
                                <TableHead>{t("cols.status")}</TableHead>
                                <TableHead>{t("cols.current_step")}</TableHead>
                                <TableHead>{t("cols.completed")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(!instances || instances.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                                        {t("empty")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                instances.map((instance) => (
                                    <TableRow key={instance.id}>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {instance.started_at ? new Date(instance.started_at).toLocaleString() : new Date(instance.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={instance.status === "completed" ? "default" : instance.status === "failed" ? "destructive" : "secondary"}
                                                className="capitalize"
                                            >
                                                {instance.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-mono">
                                            {t("step_of", { current: instance.current_step_index + 1, total: definition.steps?.length ?? 0 })}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {instance.completed_at ? new Date(instance.completed_at).toLocaleString() : "—"}
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
