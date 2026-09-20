/**
 * notification-dispatcher — renders templates and sends pending notifications.
 *
 * GET  /functions/v1/notification-dispatcher  (header: x-cron-secret)
 *        — claims up to 50 pending notifications and dispatches them.
 * POST /functions/v1/notification-dispatcher  (header: x-cron-secret)
 *   { "notification_id": "<uuid>" }                          — send one row
 *   { "organization_id": "<uuid>", "template_id": "<uuid>",
 *     "recipient_email": "a@b.c", "recipient_id": "<uuid>" | null,
 *     "variables": { ... }, "channel": "email" }              — render + send
 *
 * Template bodies support {{variable}} interpolation. Channel delivery is
 * recorded honestly: rows the worker cannot actually transmit (no provider
 * credentials configured) stay `pending` instead of being marked sent.
 */
import { jsonResponse, requireCronSecret, serviceClient } from "../_shared/runtime.ts";

function interpolate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
        const value = variables[key];
        return value === undefined || value === null ? match : String(value);
    });
}

interface NotificationRow {
    id: string;
    organization_id: string;
    recipient_id: string | null;
    recipient_email: string | null;
    template_id: string | null;
    channel: string;
    subject: string | null;
    body: string;
    entity_type: string | null;
    entity_id: string | null;
}

async function dispatchOne(
    supabase: ReturnType<typeof serviceClient>,
    notification: NotificationRow,
    variables: Record<string, unknown> = {},
): Promise<{ sent: boolean; reason: string }> {
    let subject = notification.subject;
    let body = notification.body;

    if (notification.template_id) {
        const { data: template } = await supabase.from("notification_templates")
            .select("subject, body")
            .eq("id", notification.template_id)
            .single();
        if (template) {
            const merged = { ...variables, recipient_email: notification.recipient_email ?? "" };
            subject = template.subject ? interpolate(template.subject, merged) : subject;
            body = interpolate(template.body, merged);
        }
    } else {
        subject = subject ? interpolate(subject, variables) : subject;
        body = interpolate(body, variables);
    }

    // Channel routing. Email/SMS/push hand off to a configured provider when
    // credentials exist; otherwise the row stays pending (never fake-sent).
    const provider =
        notification.channel === "email" ? Deno.env.get("SMTP_URL")
            : notification.channel === "sms" ? Deno.env.get("SMS_PROVIDER_URL")
                : notification.channel === "push" ? Deno.env.get("PUSH_PROVIDER_URL")
                    : "internal"; // in_app + webhook are stored, not transmitted

    if (notification.channel === "in_app" || notification.channel === "webhook") {
        await supabase.from("notifications").update({
            subject, body, status: "sent", sent_at: new Date().toISOString(),
        }).eq("id", notification.id);
        return { sent: true, reason: `${notification.channel} stored` };
    }

    if (!provider) {
        return { sent: false, reason: `no ${notification.channel} provider configured` };
    }

    if (notification.channel === "email" && !notification.recipient_email) {
        await supabase.from("notifications").update({ subject, body, status: "failed" }).eq("id", notification.id);
        return { sent: false, reason: "missing recipient_email" };
    }

    try {
        const res = await fetch(provider, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                to: notification.recipient_email,
                subject,
                body,
                channel: notification.channel,
                metadata: {
                    notification_id: notification.id,
                    organization_id: notification.organization_id,
                    entity_type: notification.entity_type,
                    entity_id: notification.entity_id,
                },
            }),
            signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`provider responded ${res.status}`);
        await supabase.from("notifications").update({
            subject, body, status: "sent", sent_at: new Date().toISOString(),
        }).eq("id", notification.id);
        return { sent: true, reason: `delivered via ${notification.channel} provider` };
    } catch (err) {
        await supabase.from("notifications").update({ subject, body, status: "failed" }).eq("id", notification.id);
        return { sent: false, reason: err instanceof Error ? err.message : "provider error" };
    }
}

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return jsonResponse({ error: "Method not allowed" }, 405);

    const unauthorized = requireCronSecret(req);
    if (unauthorized) return unauthorized;

    const supabase = serviceClient();

    if (req.method === "GET") {
        const { data: pending } = await supabase.from("notifications").select("*")
            .eq("status", "pending")
            .order("created_at", { ascending: true })
            .limit(50);
        const outcomes: Record<string, unknown>[] = [];
        for (const row of (pending ?? []) as NotificationRow[]) {
            outcomes.push({ id: row.id, ...(await dispatchOne(supabase, row)) });
        }
        return jsonResponse({
            ok: true,
            processed: outcomes.length,
            sent: outcomes.filter((o) => (o as { sent: boolean }).sent).length,
            outcomes,
        });
    }

    if (req.method === "POST") {
        let body: {
            notification_id?: string;
            organization_id?: string;
            template_id?: string;
            recipient_email?: string;
            recipient_id?: string | null;
            variables?: Record<string, unknown>;
            channel?: string;
        };
        try {
            body = await req.json();
        } catch {
            return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        if (body.notification_id) {
            const { data: row } = await supabase.from("notifications").select("*")
                .eq("id", body.notification_id)
                .single();
            if (!row) return jsonResponse({ error: "Notification not found" }, 404);
            return jsonResponse({ ok: true, ...(await dispatchOne(supabase, row as NotificationRow, body.variables ?? {})) });
        }

        if (!body.organization_id || !body.template_id) {
            return jsonResponse({ error: "Provide notification_id or organization_id + template_id" }, 400);
        }
        const { data: template } = await supabase.from("notification_templates").select("*")
            .eq("id", body.template_id)
            .eq("organization_id", body.organization_id)
            .single();
        if (!template) return jsonResponse({ error: "Template not found" }, 404);

        const { data: created, error } = await supabase.from("notifications").insert({
            organization_id: body.organization_id,
            recipient_id: body.recipient_id ?? null,
            recipient_email: body.recipient_email ?? null,
            template_id: template.id,
            channel: body.channel ?? template.channel,
            subject: template.subject,
            body: template.body,
            status: "pending",
        }).select("*").single();
        if (error || !created) return jsonResponse({ error: "Unable to queue notification" }, 500);

        return jsonResponse({ ok: true, ...(await dispatchOne(supabase, created as NotificationRow, body.variables ?? {})) });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
});
