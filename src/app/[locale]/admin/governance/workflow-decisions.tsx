"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, GitBranch, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { reviewWorkflowInstance } from "@/actions/workflows";
import type { WorkflowInstance } from "@/types/domain/workflows";

export function WorkflowDecisions({ initialInstances }: { initialInstances: WorkflowInstance[] }) {
    const t = useTranslations("Admin.Governance.Workflow");
    const [instances, setInstances] = useState(initialInstances);
    const [actingId, setActingId] = useState<string | null>(null);

    const review = async (id: string, decision: "approved" | "rejected") => {
        setActingId(id);
        const result = await reviewWorkflowInstance(id, decision);
        setActingId(null);
        if (result.data) {
            if (result.data.status === "running" || result.data.status === "waiting") {
                setInstances((cur) => cur.map((i) => (i.id === id ? result.data as WorkflowInstance : i)));
            } else {
                setInstances((cur) => cur.filter((i) => i.id !== id));
            }
            toast.success(decision === "approved" ? t("toast_approved") : t("toast_cancelled"));
        } else {
            toast.error(result.error || t("could_not_record"));
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <GitBranch className="h-4 w-4 text-primary" /> {t("title")} ({instances.length})
                </CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {instances.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">{t("empty")}</p>
                ) : (
                    instances.map((i) => (
                        <div key={i.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="font-mono text-xs text-muted-foreground">{i.id.slice(0, 8)} · step {i.current_step_index + 1}</p>
                                <div className="mt-1 flex items-center gap-2">
                                    <Badge variant={i.status === "waiting" ? "default" : "secondary"}>{i.status}</Badge>
                                    {i.entity_type && <span className="text-xs text-muted-foreground">{i.entity_type}</span>}
                                </div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <Button size="sm" onClick={() => review(i.id, "approved")} disabled={actingId === i.id}>
                                    {actingId === i.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                                    {t("approve_step")}
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => review(i.id, "rejected")} disabled={actingId === i.id}>
                                    <X className="mr-1 h-3 w-3" />
                                    {t("cancel")}
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
