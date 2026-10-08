"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    createNotificationTemplate,
    updateNotificationTemplate,
} from "@/actions/notifications";
import type { NotificationChannel } from "@/types/domain/notifications";
import { ArrowLeft, Bell, Loader2 } from "lucide-react";
import { Link } from "@/lib/navigation";

const CHANNEL_OPTIONS: NotificationChannel[] = [
    "email",
    "sms",
    "push",
    "in_app",
    "webhook",
];

const COMMON_VARIABLES = [
    "{{recipient_name}}",
    "{{organization_name}}",
    "{{entity_type}}",
    "{{entity_name}}",
    "{{amount}}",
    "{{date}}",
    "{{action_url}}",
];

function slugify(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Shape of a template while it is being authored. */
export interface NotificationTemplateDraft {
    name: string;
    slug: string;
    description: string;
    channel: NotificationChannel;
    subject: string;
    body: string;
    variables: string[];
}

const DEFAULT_DRAFT: NotificationTemplateDraft = {
    name: "",
    slug: "",
    description: "",
    channel: "email",
    subject: "",
    body: "",
    variables: [],
};

interface NotificationComposerProps {
    /** Initial values in edit mode. */
    initial?: NotificationTemplateDraft;
    /** Present in edit mode: the id of the template being updated. */
    templateId?: string;
    /** Back-navigation target override (defaults to /admin/notifications/templates). */
    backHref?: string;
}

export function NotificationComposer({ initial, templateId, backHref = "/admin/notifications/templates" }: NotificationComposerProps) {
    const router = useRouter();
    const t = useTranslations("Admin.Notifications.composer");
    const [draft, setDraft] = useState<NotificationTemplateDraft>(initial ?? DEFAULT_DRAFT);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const patch = (partial: Partial<NotificationTemplateDraft>) => setDraft((prev) => ({ ...prev, ...partial }));

    /** Extracts `{{variable}}` placeholders used in subject/body into `variables`. */
    const syncVariables = (subject: string, body: string) => {
        const matches = `${subject}\n${body}`.match(/\{\{\s*[a-z0-9_]+\s*\}\}/gi) ?? [];
        patch({ subject, body, variables: Array.from(new Set(matches.map((m) => m.replace(/\s/g, "")))) });
    };

    const insertVariable = (variable: string) => {
        syncVariables(draft.subject, `${draft.body}${variable}`);
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!draft.name.trim() || !draft.body.trim()) {
            setError(t("required"));
            return;
        }

        setLoading(true);
        setError(null);

        const payload = {
            name: draft.name.trim(),
            slug: slugify(draft.slug || draft.name),
            description: draft.description.trim() || null,
            channel: draft.channel,
            subject: draft.channel === "email" || draft.channel === "push" ? draft.subject.trim() || null : null,
            body: draft.body,
            variables: draft.variables,
            is_system: false,
        };

        const result = templateId
            ? await updateNotificationTemplate(templateId, payload)
            : await createNotificationTemplate(payload);

        if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        router.push("/admin/notifications/templates");
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href={backHref}>
                        <ArrowLeft className="h-4 w-4" /> {t("back")}
                    </Link>
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Bell className="h-4 w-4 text-blue-500" /> {t("details_title")}
                    </CardTitle>
                    <CardDescription>{t("details_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("name_label")}</label>
                            <Input
                                required
                                value={draft.name}
                                onChange={(e) => patch({ name: e.target.value, slug: draft.slug || slugify(e.target.value) })}
                                placeholder={t("name_ph")}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("slug_label")}</label>
                            <Input
                                value={draft.slug}
                                onChange={(e) => patch({ slug: slugify(e.target.value) })}
                                placeholder="donation-thank-you-email"
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("desc_label")}</label>
                        <Input
                            value={draft.description}
                            onChange={(e) => patch({ description: e.target.value })}
                            placeholder={t("desc_ph")}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("channel_label")}</label>
                        <Select value={draft.channel} onValueChange={(value) => patch({ channel: value as NotificationChannel })}>
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CHANNEL_OPTIONS.map((channel) => (
                                    <SelectItem key={channel} value={channel}>
                                        {t(channel)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {draft.channel === "email" || draft.channel === "push" ? (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("subject_label")}</label>
                            <Input
                                value={draft.subject}
                                onChange={(e) => syncVariables(e.target.value, draft.body)}
                                placeholder={t("subject_ph")}
                            />
                        </div>
                    ) : null}

                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t("body_label")} {draft.channel === "sms" ? t("body_sms_hint") : ""}
                        </label>
                        <Textarea
                            required
                            value={draft.body}
                            onChange={(e) => syncVariables(draft.subject, e.target.value)}
                            placeholder={t("body_ph")}
                            className="min-h-32"
                        />
                        {draft.channel === "sms" && draft.body.length > 320 ? (
                            <p className="text-xs text-destructive">{t("sms_too_long", { count: draft.body.length })}</p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t("variables_label")}
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {draft.variables.length === 0 ? (
                                <p className="text-xs text-muted-foreground">{t("variables_empty")}</p>
                            ) : (
                                draft.variables.map((variable) => (
                                    <span key={variable} className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">{variable}</span>
                                ))
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {COMMON_VARIABLES.map((variable) => (
                                <Button
                                    key={variable}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 font-mono text-xs"
                                    onClick={() => insertVariable(variable)}
                                >
                                    + {variable}
                                </Button>
                            ))}
                        </div>
                    </div>

                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button asChild variant="outline">
                    <Link href={backHref}>{t("cancel")}</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? t("saving") : templateId ? t("save_edit") : t("save_new")}
                </Button>
            </div>
        </form>
    );

}

