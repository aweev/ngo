"use client";

import { useState } from "react";
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

const CHANNEL_OPTIONS: { value: NotificationChannel; label: string }[] = [
    { value: "email", label: "Email" },
    { value: "sms", label: "SMS" },
    { value: "push", label: "Push" },
    { value: "in_app", label: "In-App" },
    { value: "webhook", label: "Webhook" },
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
            setError("A template name and body are required.");
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
                        <ArrowLeft className="h-4 w-4" /> Back to Templates
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
                        <Bell className="h-4 w-4 text-blue-500" /> Template Details
                    </CardTitle>
                    <CardDescription>Identity, delivery channel, and message content.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Template name</label>
                            <Input
                                required
                                value={draft.name}
                                onChange={(e) => patch({ name: e.target.value, slug: draft.slug || slugify(e.target.value) })}
                                placeholder="e.g. Donation Thank You Email"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slug</label>
                            <Input
                                value={draft.slug}
                                onChange={(e) => patch({ slug: slugify(e.target.value) })}
                                placeholder="donation-thank-you-email"
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                        <Input
                            value={draft.description}
                            onChange={(e) => patch({ description: e.target.value })}
                            placeholder="Where and when this template is used"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Channel</label>
                        <Select value={draft.channel} onValueChange={(value) => patch({ channel: value as NotificationChannel })}>
                            <SelectTrigger className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {CHANNEL_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {draft.channel === "email" || draft.channel === "push" ? (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
                            <Input
                                value={draft.subject}
                                onChange={(e) => syncVariables(e.target.value, draft.body)}
                                placeholder="Thank you for your donation, {{recipient_name}}!"
                            />
                        </div>
                    ) : null}

                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Body {draft.channel === "sms" ? "(max ~320 chars)" : ""}
                        </label>
                        <Textarea
                            required
                            value={draft.body}
                            onChange={(e) => syncVariables(draft.subject, e.target.value)}
                            placeholder="Write the message content. Use variables like {{recipient_name}}."
                            className="min-h-32"
                        />
                        {draft.channel === "sms" && draft.body.length > 320 ? (
                            <p className="text-xs text-destructive">Body is {draft.body.length} characters — consider shortening for SMS.</p>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Variables detected
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {draft.variables.length === 0 ? (
                                <p className="text-xs text-muted-foreground">None yet — insert a placeholder below.</p>
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
                    <Link href={backHref}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Saving..." : templateId ? "Save template" : "Create template"}
                </Button>
            </div>
        </form>
    );

}

