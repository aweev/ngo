"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/lib/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    applyAutomationBundle, createRoleFromPreset, previewAutomationBundle,
    type AutomationBundlePreview,
} from "@/actions/presets";
import { instantiateAutomationTemplate } from "@/actions/automations";
import { AUTOMATION_BUNDLES, ROLE_PRESETS } from "@/lib/presets";
import { GitBranch, LayoutTemplate, Loader2, ShieldCheck, Zap } from "lucide-react";

/** Structural shape shared by the domain type and the action's partial select. */
export interface TemplateCard {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    trigger_type: string;
}

/**
 * Unified starter-template gallery (ADR-0001, Slice B): one UX, two catalogs —
 * role permission presets and automation bundles/templates. Everything is
 * created as a draft/disabled artifact so nothing runs until an admin reviews it.
 */
export function TemplateGallery({ dbTemplates }: { dbTemplates: TemplateCard[] }) {
    const t = useTranslations("Admin.Templates");
    const router = useRouter();
    const [pending, setPending] = useState<string | null>(null);
    const [preview, setPreview] = useState<{ id: string; data: AutomationBundlePreview } | null>(null);
    const [installing, setInstalling] = useState<false | "disabled" | "active">(false);

    async function applyRolePreset(presetId: string) {
        setPending(presetId);
        const result = await createRoleFromPreset({ presetId });
        setPending(null);
        if (!result.data) {
            toast.error(result.error || t("role_failed"));
            return;
        }
        toast.success(t("role_created"));
        router.push(`/admin/rbac/roles/${result.data.id}`);
    }

    async function openPreview(bundleId: string) {
        setPending(bundleId);
        const result = await previewAutomationBundle({ bundleId });
        setPending(null);
        if (!result.data) {
            toast.error(result.error || t("bundle_failed"));
            return;
        }
        setPreview({ id: bundleId, data: result.data });
    }

    async function installBundle(activate: boolean) {
        if (!preview) return;
        setInstalling(activate ? "active" : "disabled");
        const result = await applyAutomationBundle({ bundleId: preview.id, activate });
        setInstalling(false);
        if (!result.ruleId) {
            toast.error(result.error || t("bundle_failed"));
            return;
        }
        toast.success(activate ? t("bundle_activated") : t("bundle_created"));
        setPreview(null);
        router.push("/admin/automations");
    }

    async function installTemplate(templateId: string) {
        setPending(templateId);
        const result = await instantiateAutomationTemplate(templateId);
        setPending(null);
        if (!result.data) {
            toast.error(result.error || t("template_failed"));
            return;
        }
        toast.success(t("template_created"));
        router.push(`/admin/automations/${result.data.id}`);
    }

    return (
        <Tabs defaultValue="roles" className="space-y-4">
            <TabsList>
                <TabsTrigger value="roles" className="gap-2">
                    <ShieldCheck className="h-4 w-4" /> {t("tab_roles")}
                </TabsTrigger>
                <TabsTrigger value="automations" className="gap-2">
                    <Zap className="h-4 w-4" /> {t("tab_automations")}
                </TabsTrigger>
            </TabsList>

            <TabsContent value="roles" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">{t("roles_title")}</CardTitle>
                        <CardDescription>{t("roles_description")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {ROLE_PRESETS.map((preset) => (
                                <div key={preset.id} className="flex flex-col gap-3 rounded-lg border p-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold">{preset.name}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{preset.description}</p>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            {t("permission_count", { count: preset.permissions.length })}
                                        </Badge>
                                        <Button size="sm" onClick={() => applyRolePreset(preset.id)} disabled={pending === preset.id} className="gap-1">
                                            {pending === preset.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                                            {pending === preset.id ? t("using") : t("use_role")}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="automations" className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                            <Zap className="h-4 w-4 text-amber-500" /> {t("bundles_title")}
                        </CardTitle>
                        <CardDescription>{t("bundles_description")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {AUTOMATION_BUNDLES.map((bundle) => (
                                <div key={bundle.id} className="flex flex-col gap-3 rounded-lg border p-4">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold">{bundle.name}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{bundle.description}</p>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        {bundle.workflow ? (
                                            <Badge variant="secondary" className="gap-1 text-xs">
                                                <GitBranch className="h-3 w-3" /> {t("creates_workflow")}
                                            </Badge>
                                        ) : <span className="text-xs text-muted-foreground capitalize">{bundle.event}</span>}
                                        <Button size="sm" variant="outline" onClick={() => openPreview(bundle.id)} disabled={pending === bundle.id} className="gap-1">
                                            {pending === bundle.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                                            {pending === bundle.id ? t("using") : t("review")}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {dbTemplates.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <LayoutTemplate className="h-4 w-4 text-primary" /> {t("templates_title")}
                            </CardTitle>
                            <CardDescription>{t("templates_description")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {dbTemplates.map((tpl) => (
                                    <div key={tpl.id} className="flex items-start justify-between gap-3 rounded-lg border p-4">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold">{tpl.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">{tpl.description || tpl.category || tpl.trigger_type}</p>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => installTemplate(tpl.id)} disabled={pending === tpl.id} className="shrink-0 gap-1">
                                            {pending === tpl.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                                            {pending === tpl.id ? t("using") : t("use_template")}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </TabsContent>

            {preview && (
                <Dialog open onOpenChange={(open) => { if (!open && installing === false) setPreview(null); }}>
                    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{preview.data.name}</DialogTitle>
                            <DialogDescription>{preview.data.description}</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 text-sm">
                            <p className="text-xs text-muted-foreground">{t("preview_description")}</p>

                            <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("preview_trigger")}</p>
                                <Badge variant="outline" className="font-mono text-[11px]">{preview.data.event}</Badge>
                            </div>

                            {preview.data.conditions.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("preview_conditions")}</p>
                                    <ul className="space-y-1">
                                        {preview.data.conditions.map((condition, index) => (
                                            <li key={`${condition.field}-${index}`} className="flex items-center gap-2 font-mono text-[11px]">
                                                <span>{condition.field}</span>
                                                <Badge variant="secondary" className="text-[10px]">{condition.operator}</Badge>
                                                <span>{condition.value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("preview_actions")}</p>
                                <ul className="space-y-1">
                                    {preview.data.actions.map((action, index) => (
                                        <li key={`${action.type}-${index}`} className="flex flex-wrap items-center gap-2">
                                            <span>{t(`action_${action.type}`)}</span>
                                            {action.channel && <Badge variant="outline" className="text-[10px]">{action.channel}</Badge>}
                                            {action.recipient && <Badge variant="outline" className="text-[10px]">{action.recipient}</Badge>}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {preview.data.workflow && (
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("preview_workflow")}</p>
                                    <p className="text-sm font-medium">{preview.data.workflow.name}</p>
                                    <ol className="list-inside list-decimal space-y-0.5 text-xs text-muted-foreground">
                                        {preview.data.workflow.steps.map((step, index) => (
                                            <li key={`${step.name}-${index}`}>{step.name}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-2 sm:justify-between">
                            <Button variant="ghost" onClick={() => setPreview(null)} disabled={installing !== false}>
                                {t("cancel")}
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => installBundle(false)} disabled={installing !== false} className="gap-1">
                                    {installing === "disabled" && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {t("install_disabled")}
                                </Button>
                                <Button onClick={() => installBundle(true)} disabled={installing !== false} className="gap-1">
                                    {installing === "active" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                                    {t("install_activate")}
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </Tabs>
    );
}
