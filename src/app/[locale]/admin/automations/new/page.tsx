"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAutomationRule } from "@/actions/automations";
import { Zap, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Link } from "@/lib/navigation";
import { PageHeader } from "@/components/manage/page-header";

export default function NewAutomationRulePage() {
    const router = useRouter();
    const t = useTranslations("Admin.Automations");
    const tCommon = useTranslations("Admin.Common");
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [triggerType, setTriggerType] = useState<"event" | "schedule" | "condition" | "webhook" | "manual">("event");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;
        setLoading(true);

        const res = await createAutomationRule({
            name,
            description: description || null,
            is_enabled: true,
            trigger_type: triggerType,
            trigger_config: { event: "donation.created" },
            conditions: [],
            actions: [{ type: "send_notification", config: { template: "thank_you_email" } }],
            created_by: null,
        });

        setLoading(false);
        if (!res.error) {
            router.push("/admin/automations");
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href="/admin/automations">
                        <ArrowLeft className="h-4 w-4" /> {t("back_to_rules")}
                    </Link>
                </Button>
            </div>

            <PageHeader
                title={t("new_title")}
                description={t("new_description")}
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" /> {t("step1_title")}
                        </CardTitle>
                        <CardDescription>{t("step1_description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("rule_name")}</label>
                            <Input
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t("rule_name_placeholder")}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("description_label")}</label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t("description_placeholder")}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("trigger_type")}</label>
                            <Select value={triggerType} onValueChange={(val) => setTriggerType(val as typeof triggerType)}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("trigger_placeholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="event">{t("trigger_event")}</SelectItem>
                                    <SelectItem value="schedule">{t("trigger_schedule")}</SelectItem>
                                    <SelectItem value="condition">{t("trigger_condition")}</SelectItem>
                                    <SelectItem value="webhook">{t("trigger_webhook")}</SelectItem>
                                    <SelectItem value="manual">{t("trigger_manual")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/automations">{tCommon("cancel")}</Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? t("saving") : t("save")}
                    </Button>
                </div>
            </form>
        </div>
    );
}
