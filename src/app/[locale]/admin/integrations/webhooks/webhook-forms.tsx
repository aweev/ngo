"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createWebhook, toggleWebhook } from "@/actions/integrations";
import type { Webhook } from "@/types/domain/integrations";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Webhook as WebhookIcon } from "lucide-react";

const EVENT_SUGGESTIONS = [
    "donation.created",
    "donor.registered",
    "volunteer.approved",
    "event.published",
    "expense.submitted",
    "project.completed",
    "report.generated",
];

export function NewWebhookForm() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [events, setEvents] = useState("donation.created");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!name.trim() || !url.trim()) {
            setError("A webhook name and target URL are required.");
            return;
        }
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url.trim());
            if (!["https:", "http:"].includes(parsedUrl.protocol)) throw new Error("bad protocol");
        } catch {
            setError("Please provide a valid http(s) URL.");
            return;
        }
        setLoading(true);
        setError(null);
        const result = await createWebhook({
            name: name.trim(),
            url: parsedUrl.toString(),
            events: events.split(",").map((e) => e.trim()).filter(Boolean),
            secret_token: null,
            created_by: null,
        });
        setLoading(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        window.location.reload();
    }

    if (!open) {
        return (
            <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> New Webhook
            </Button>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <WebhookIcon className="h-4 w-4 text-violet-500" /> Register webhook
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label htmlFor="webhook-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</label>
                            <Input id="webhook-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CRM sync" />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="webhook-url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target URL</label>
                            <Input id="webhook-url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/hooks/ngo" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="webhook-events" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscribed events (comma-separated)</label>
                        <Input id="webhook-events" value={events} onChange={(e) => setEvents(e.target.value)} placeholder={EVENT_SUGGESTIONS.join(", ")} />
                        <p className="text-xs text-muted-foreground">Suggestions: {EVENT_SUGGESTIONS.join(", ")}</p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Registering..." : "Register webhook"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export function WebhookToggle({ webhook }: { webhook: Webhook }) {
    const [loading, setLoading] = useState(false);

    async function handleToggle() {
        setLoading(true);
        await toggleWebhook(webhook.id, !webhook.is_active);
        setLoading(false);
        window.location.reload();
    }

    return (
        <div className="flex items-center justify-end gap-2">
            <Badge variant={webhook.is_active ? "default" : "secondary"}>
                {webhook.is_active ? "Active" : "Inactive"}
            </Badge>
            <Button size="sm" variant="outline" disabled={loading} onClick={handleToggle}>
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : webhook.is_active ? "Pause" : "Activate"}
            </Button>
        </div>
    );
}
