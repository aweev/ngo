"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createWorkflowDefinition, updateWorkflowDefinition } from "@/actions/workflows";
import type { WorkflowStep, WorkflowStepType } from "@/types/domain/workflows";
import { ArrowDown, ArrowLeft, ArrowUp, GitBranch, Loader2, Plus, Trash2 } from "lucide-react";
import { Link } from "@/lib/navigation";

function getStepTypes(t: (key: string) => string): { value: WorkflowStepType; label: string; description: string }[] {
    return [
        { value: "task", label: t("step_task_label"), description: t("step_task_desc") },
        { value: "approval", label: t("step_approval_label"), description: t("step_approval_desc") },
        { value: "condition", label: t("step_condition_label"), description: t("step_condition_desc") },
        { value: "notification", label: t("step_notification_label"), description: t("step_notification_desc") },
        { value: "action", label: t("step_action_label"), description: t("step_action_desc") },
        { value: "delay", label: t("step_delay_label"), description: t("step_delay_desc") },
        { value: "parallel", label: t("step_parallel_label"), description: t("step_parallel_desc") },
    ];
}

function getAssigneeTypes(t: (key: string) => string) {
    return [
        { value: "user", label: t("assignee_user") },
        { value: "role", label: t("assignee_role") },
        { value: "any", label: t("assignee_any") },
    ] as const;
}

let stepSeq = 0;
/** Client-only unique id for new steps (never persisted to the database). */
function nextStepId(): string {
    stepSeq += 1;
    return `step_${Date.now().toString(36)}_${stepSeq}`;
}

function slugify(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Shape of a definition while it is being authored. */
export interface WorkflowDraft {
    name: string;
    slug: string;
    description: string;
    status: "draft" | "active" | "archived";
    trigger_config: Record<string, unknown>;
    steps: WorkflowStep[];
}

const DEFAULT_DRAFT: WorkflowDraft = {
    name: "",
    slug: "",
    description: "",
    status: "draft",
    trigger_config: {},
    steps: [
        { id: nextStepId(), name: "Initial Review", type: "approval", config: {}, step_index: 0 },
    ],
};

interface WorkflowBuilderProps {
    /** Initial values in edit mode. */
    initial?: WorkflowDraft;
    /** Present in edit mode: the id of the definition being updated. */
    definitionId?: string;
    /** Back-navigation target override (defaults to /admin/workflows). */
    backHref?: string;
}

export function WorkflowBuilder({ initial, definitionId, backHref = "/admin/workflows" }: WorkflowBuilderProps) {
    const router = useRouter();
    const t = useTranslations("Admin.Workflows.builder");
    const stepTypes = getStepTypes(t);
    const assigneeTypes = getAssigneeTypes(t);
    const [draft, setDraft] = useState<WorkflowDraft>(initial ?? DEFAULT_DRAFT);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const patch = (partial: Partial<WorkflowDraft>) => setDraft((prev) => ({ ...prev, ...partial }));

    const patchStep = (index: number, partial: Partial<WorkflowStep>) => {
        setDraft((prev) => ({
            ...prev,
            steps: prev.steps.map((s, i) => (i === index ? { ...s, ...partial } : s)),
        }));
    };

    const addStep = (afterIndex = draft.steps.length - 1) => {
        setDraft((prev) => {
            const steps = [...prev.steps];
            const step: WorkflowStep = { id: nextStepId(), name: `Step ${steps.length + 1}`, type: "task", config: {}, step_index: 0 };
            steps.splice(afterIndex + 1, 0, step);
            return { ...prev, steps: steps.map((s, i) => ({ ...s, step_index: i })) };
        });
    };

    const removeStep = (index: number) => {
        setDraft((prev) => {
            if (prev.steps.length <= 1) return prev; // a workflow needs at least one step
            const steps = prev.steps.filter((_, i) => i !== index);
            return { ...prev, steps: steps.map((s, i) => ({ ...s, step_index: i })) };
        });
    };

    const moveStep = (index: number, direction: -1 | 1) => {
        setDraft((prev) => {
            const target = index + direction;
            if (target < 0 || target >= prev.steps.length) return prev;
            const steps = [...prev.steps];
            [steps[index], steps[target]] = [steps[target], steps[index]];
            return { ...prev, steps: steps.map((s, i) => ({ ...s, step_index: i })) };
        });
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!draft.name.trim() || !draft.slug.trim()) {
            setError("A workflow name and URL slug are required.");
            return;
        }

        setLoading(true);
        setError(null);

        const payload = {
            name: draft.name.trim(),
            slug: slugify(draft.slug),
            description: draft.description.trim() || null,
            status: draft.status,
            steps: draft.steps.map((s, i) => ({ ...s, step_index: i })),
            trigger_config: draft.trigger_config,
            created_by: null,
        };

        const result = definitionId
            ? await updateWorkflowDefinition(definitionId, payload)
            : await createWorkflowDefinition(payload);

        if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        router.push("/admin/workflows");
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href={backHref}>
                        <ArrowLeft className="h-4 w-4" /> Back to Workflows
                    </Link>
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Definition details */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <GitBranch className="h-4 w-4 text-blue-500" /> Workflow Definition
                    </CardTitle>
                    <CardDescription>{t("def_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("name_label")}</label>
                            <Input
                                required
                                value={draft.name}
                                onChange={(e) => patch({ name: e.target.value, slug: draft.slug || slugify(e.target.value) })}
                                placeholder="e.g. Grant Application Approval Flow"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("slug_label")}</label>
                            <Input
                                required
                                value={draft.slug}
                                onChange={(e) => patch({ slug: slugify(e.target.value) })}
                                placeholder="grant-approval-flow"
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                        <Textarea
                            value={draft.description}
                            onChange={(e) => patch({ description: e.target.value })}
                            placeholder={t("description_ph")}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                        <Select value={draft.status} onValueChange={(value) => patch({ status: value as WorkflowDraft["status"] })}>
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Steps */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Steps</CardTitle>
                    <CardDescription>{t("steps_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {draft.steps.map((step, index) => {
                        const stepType = stepTypes.find((option) => option.value === step.type);
                        const needsAssignee = step.type === "task" || step.type === "approval" || step.type === "notification";
                        return (
                            <div key={step.id} className="space-y-3 rounded-lg border p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-mono">{index + 1}</Badge>
                                        <span className="text-xs text-muted-foreground">{stepType?.description}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => moveStep(index, -1)}>
                                            <ArrowUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={index === draft.steps.length - 1}
                                            onClick={() => moveStep(index, 1)}
                                        >
                                            <ArrowDown className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive"
                                            disabled={draft.steps.length <= 1}
                                            onClick={() => removeStep(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("step_name_label")}</label>
                                        <Input
                                            value={step.name}
                                            onChange={(e) => patchStep(index, { name: e.target.value })}
                                            placeholder={t("step_name_ph")}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("step_type_label")}</label>
                                        <Select
                                            value={step.type}
                                            onValueChange={(value) => patchStep(index, { type: value as WorkflowStepType, config: {} })}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {stepTypes.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {needsAssignee ? (
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("assignee_type_label")}</label>
                                            <Select
                                                value={step.assignee_type ?? "any"}
                                                onValueChange={(value) =>
                                                    patchStep(index, { assignee_type: value as WorkflowStep["assignee_type"], assignee_id: undefined })
                                                }
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {assigneeTypes.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Assignee (user/role id)
                                            </label>
                                            <Input
                                                value={step.assignee_id ?? ""}
                                                disabled={step.assignee_type === "any" || !step.assignee_type}
                                                onChange={(e) => patchStep(index, { assignee_id: e.target.value || undefined })}
                                                placeholder="admin"
                                                className="h-9 font-mono text-xs"
                                            />
                                        </div>
                                    </div>
                                ) : null}

                                {step.type === "delay" ? (
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("wait_label")}</label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={Number(step.config.hours ?? 0)}
                                            onChange={(e) => patchStep(index, { config: { hours: Math.max(0, Number(e.target.value) || 0) } })}
                                            className="h-9 w-32"
                                        />
                                    </div>
                                ) : null}

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("due_label")}</label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={step.due_in_hours ?? ""}
                                            onChange={(e) => patchStep(index, { due_in_hours: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })}
                                            placeholder="72"
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("config_label")}</label>
                                        <Input
                                            value={JSON.stringify(step.config)}
                                            onChange={(e) => {
                                                try {
                                                    patchStep(index, { config: JSON.parse(e.target.value) as Record<string, unknown> });
                                                } catch {
                                                    // keep last valid config while the user is typing
                                                }
                                            }}
                                            className="h-9 font-mono text-xs"
                                        />
                                    </div>
                                </div>

                                <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => addStep(index)}>
                                    <Plus className="h-3 w-3" /> Insert step below
                                </Button>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button asChild variant="outline">
                    <Link href={backHref}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Saving..." : definitionId ? "Save changes" : "Create workflow"}
                </Button>
            </div>
        </form>
    );
}

