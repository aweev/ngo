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
import { createAutomationRule, updateAutomationRule } from "@/actions/automations";
import type {
    AutomationAction,
    AutomationCondition,
    AutomationTriggerType,
} from "@/types/domain/automations";
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Plus, Trash2, Zap } from "lucide-react";
import { Link } from "@/lib/navigation";
import { CronEditor } from "./cron-editor";

/** Shape of a rule while it is being authored (before insert/update). */
export interface AutomationRuleDraft {
    name: string;
    description: string;
    trigger_type: AutomationTriggerType;
    trigger_config: Record<string, unknown>;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
}



const DEFAULT_DRAFT: AutomationRuleDraft = {
    name: "",
    description: "",
    trigger_type: "event",
    trigger_config: { event: "donation.created" },
    conditions: [],
    actions: [{ type: "send_notification", config: { subject: "Thank you", body: "..." } }],
};

function slugify(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface AutomationRuleBuilderProps {
    /** Initial values in edit mode. */
    initial?: AutomationRuleDraft;
    /** Present in edit mode: the id of the rule being updated. */
    ruleId?: string;
    /** Back-navigation target override (defaults to /admin/automations). */
    backHref?: string;
}

export function AutomationRuleBuilder({ initial, ruleId, backHref = "/admin/automations" }: AutomationRuleBuilderProps) {
    const t = useTranslations("Admin.Automations.rulebuilder");

    const TRIGGER_OPTIONS: { value: AutomationTriggerType; label: string }[] = [
        { value: "event", label: t("trg_event") },
        { value: "schedule", label: t("trg_schedule") },
        { value: "condition", label: t("trg_condition") },
        { value: "webhook", label: t("trg_webhook") },
        { value: "manual", label: t("trg_manual") },
    ];

    const EVENT_SUGGESTIONS = [
        "donation.created",
        "donor.registered",
        "volunteer.approved",
        "event.published",
        "expense.submitted",
        "project.completed",
        "worker.onboarded",
    ];

    const CONDITION_OPERATORS: { value: AutomationCondition["operator"]; label: string }[] = [
        { value: "eq", label: t("op_eq") },
        { value: "ne", label: t("op_ne") },
        { value: "gt", label: t("op_gt") },
        { value: "lt", label: t("op_lt") },
        { value: "gte", label: t("op_gte") },
        { value: "lte", label: t("op_lte") },
        { value: "contains", label: t("op_contains") },
        { value: "not_contains", label: t("op_not_contains") },
        { value: "is_empty", label: t("op_is_empty") },
        { value: "is_not_empty", label: t("op_is_not_empty") },
    ];

    const ACTION_OPTIONS: { value: AutomationAction["type"]; label: string }[] = [
        { value: "send_notification", label: t("act_send_notification") },
        { value: "send_email", label: t("act_send_email") },
        { value: "create_task", label: t("act_create_task") },
        { value: "update_field", label: t("act_update_field") },
        { value: "trigger_webhook", label: t("act_trigger_webhook") },
        { value: "start_workflow", label: t("act_start_workflow") },
        { value: "create_record", label: t("act_create_record") },
        { value: "custom", label: t("act_custom") },
    ];
    const router = useRouter();
    const [draft, setDraft] = useState<AutomationRuleDraft>(initial ?? DEFAULT_DRAFT);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const patch = (partial: Partial<AutomationRuleDraft>) => setDraft((prev) => ({ ...prev, ...partial }));

    const patchCondition = (index: number, partial: Partial<AutomationCondition>) => {
        setDraft((prev) => ({
            ...prev,
            conditions: prev.conditions.map((c, i) => (i === index ? { ...c, ...partial } : c)),
        }));
    };

    const addCondition = () => {
        setDraft((prev) => ({
            ...prev,
            conditions: [
                ...prev.conditions,
                { field: "amount", operator: "gt", value: 0, logic: prev.conditions.length === 0 ? undefined : "and" },
            ],
        }));
    };

    const removeCondition = (index: number) => {
        setDraft((prev) => ({ ...prev, conditions: prev.conditions.filter((_, i) => i !== index) }));
    };

    const patchAction = (index: number, partial: Partial<AutomationAction>) => {
        setDraft((prev) => ({
            ...prev,
            actions: prev.actions.map((a, i) => (i === index ? { ...a, ...partial } : a)),
        }));
    };

    const addAction = () => {
        setDraft((prev) => ({ ...prev, actions: [...prev.actions, { type: "send_notification", config: {} }] }));
    };

    const removeAction = (index: number) => {
        setDraft((prev) => ({ ...prev, actions: prev.actions.filter((_, i) => i !== index) }));
    };

    const moveAction = (index: number, direction: -1 | 1) => {
        setDraft((prev) => {
            const next = [...prev.actions];
            const target = index + direction;
            if (target < 0 || target >= next.length) return prev;
            [next[index], next[target]] = [next[target], next[index]];
            return { ...prev, actions: next };
        });
    };

    const handleTriggerChange = (triggerType: AutomationTriggerType) => {
        const trigger_config =
            triggerType === "schedule"
                ? { cron: "0 9 * * *" }
                : triggerType === "event" || triggerType === "webhook"
                  ? { event: "donation.created" }
                  : {};
        patch({ trigger_type: triggerType, trigger_config });
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!draft.name.trim()) {
            setError("A rule name is required.");
            return;
        }
        if (draft.actions.length === 0) {
            setError("At least one action is required — the rule would otherwise do nothing.");
            return;
        }

        setLoading(true);
        setError(null);

        const payload = {
            name: draft.name.trim(),
            description: draft.description.trim() || null,
            trigger_type: draft.trigger_type,
            trigger_config: draft.trigger_config,
            conditions: draft.conditions,
            actions: draft.actions,
            created_by: null,
        };

        const result = ruleId
            ? await updateAutomationRule(ruleId, payload)
            : await createAutomationRule({ ...payload, is_enabled: true });

        if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        router.push("/admin/automations");
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href={backHref}>
                        <ArrowLeft className="h-4 w-4" /> Back to Rules
                    </Link>
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Step 1: Trigger */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Zap className="h-4 w-4 text-amber-500" /> 1. Trigger
                    </CardTitle>
                    <CardDescription>{t("trigger_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("name_label")}</label>
                        <Input
                            required
                            value={draft.name}
                            onChange={(e) => patch({ name: e.target.value })}
                            placeholder="e.g. Auto-notify finance on large donations"
                        />
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
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("trigger_type_label")}</label>
                        <Select value={draft.trigger_type} onValueChange={(value) => handleTriggerChange(value as AutomationTriggerType)}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("trigger_select_ph")} />
                            </SelectTrigger>
                            <SelectContent>
                                {TRIGGER_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {draft.trigger_type === "schedule" ? (
                        <CronEditor
                            value={String(draft.trigger_config.cron ?? "0 9 * * *")}
                            onChange={(cron) => patch({ trigger_config: { cron } })}
                        />
                    ) : null}

                    {draft.trigger_type === "event" || draft.trigger_type === "webhook" ? (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {draft.trigger_type === "webhook" ? "Incoming webhook event" : "Domain event"}
                            </label>
                            <Input
                                value={String(draft.trigger_config.event ?? "")}
                                onChange={(e) => patch({ trigger_config: { event: slugify(e.target.value).replace(/-/g, ".") } })}
                                placeholder="donation.created"
                                className="font-mono text-sm"
                            />
                            <div className="flex flex-wrap gap-2">
                                {EVENT_SUGGESTIONS.map((suggestion) => (
                                    <Button
                                        key={suggestion}
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="font-mono text-xs"
                                        onClick={() => patch({ trigger_config: { event: suggestion } })}
                                    >
                                        {suggestion}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Step 2: Conditions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">2. Conditions (optional)</CardTitle>
                    <CardDescription>{t("cond_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {draft.conditions.length === 0 && (
                        <p className="text-xs text-muted-foreground">{t("cond_none")}</p>
                    )}
                    {draft.conditions.map((condition, index) => (
                        <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
                            <div className="w-44 space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("cond_field_label")}</label>
                                <Input
                                    value={condition.field}
                                    onChange={(e) => patchCondition(index, { field: e.target.value })}
                                    placeholder={t("cond_field_ph")}
                                    className="h-9 font-mono text-xs"
                                />
                            </div>
                            <div className="w-44 space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("cond_operator_label")}</label>
                                <Select
                                    value={condition.operator}
                                    onValueChange={(value) => patchCondition(index, { operator: value as AutomationCondition["operator"] })}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CONDITION_OPERATORS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="min-w-32 flex-1 space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("cond_value_label")}</label>
                                <Input
                                    value={String(condition.value ?? "")}
                                    disabled={condition.operator === "is_empty" || condition.operator === "is_not_empty"}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        const numeric = Number(raw);
                                        patchCondition(index, { value: raw !== "" && !Number.isNaN(numeric) ? numeric : raw });
                                    }}
                                    className="h-9 font-mono text-xs"
                                />
                            </div>
                            {index > 0 ? (
                                <div className="w-24 space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Logic</label>
                                    <Select
                                        value={condition.logic ?? "and"}
                                        onValueChange={(value) => patchCondition(index, { logic: value as "and" | "or" })}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="and">AND</SelectItem>
                                            <SelectItem value="or">OR</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : null}
                            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeCondition(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addCondition}>
                        <Plus className="h-3 w-3" /> {t("add_condition")}
                    </Button>
                </CardContent>
            </Card>

            {/* Step 3: Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">3. Actions</CardTitle>
                    <CardDescription>{t("actions_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {draft.actions.map((action, index) => (
                        <div key={index} className="space-y-3 rounded-lg border p-3">
                            <div className="flex items-center justify-between gap-2">
                                <Badge variant="outline" className="font-mono">#{index + 1}</Badge>
                                <div className="flex items-center gap-1">
                                    <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => moveAction(index, -1)}>
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={index === draft.actions.length - 1}
                                        onClick={() => moveAction(index, 1)}
                                    >
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeAction(index)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("action_type_label")}</label>
                                    <Select value={action.type} onValueChange={(value) => patchAction(index, { type: value as AutomationAction["type"], config: {} })}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ACTION_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("delay_label")}</label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={action.delay_seconds ?? 0}
                                        onChange={(e) =>
                                            patchAction(index, { delay_seconds: Math.max(0, Number(e.target.value) || 0) })
                                        }
                                        className="h-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t("config_label")}
                                </label>
                                <Textarea
                                    value={JSON.stringify(action.config, null, 0)}
                                    onChange={(e) => {
                                        try {
                                            patchAction(index, { config: JSON.parse(e.target.value) as Record<string, unknown> });
                                        } catch {
                                            // keep last valid config while the user is typing
                                        }
                                    }}
                                    className="min-h-16 font-mono text-xs"
                                />
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addAction}>
                        <Plus className="h-3 w-3" /> {t("add_action")}
                    </Button>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button asChild variant="outline">
                    <Link href={backHref}>{t("cancel")}</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? t("saving") : ruleId ? t("save_edit") : t("save_new")}
                </Button>
            </div>

        </form>
    );

}

