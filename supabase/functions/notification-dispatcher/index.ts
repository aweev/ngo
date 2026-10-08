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
 *
 * Recipient preferences (notification_preferences) are enforced before
 * transmit: disabled channels and quiet hours hold the row as `pending`
 * with a reason; non-immediate digest cadences hold transmissive channels
 * for aggregation. in_app/webhook store immediately when enabled. Quiet
 * hours run on the member's timezone (NULL = UTC).
import { jsonResponse, requireCronSecret, serviceClient } from "../_shared/runtime.ts";
import { logEvent, nextAttemptIso } from "../_shared/reliability.ts";

/** Worker identity for notification leases (unique per invocation). */
const WORKER_ID = `dispatcher-${crypto.randomUUID()}`;

function interpolate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
        const value = variables[key];
        return value === undefined || value === null ? match : String(value);
    });
}

/** How the GET settle path treats a dispatch result. */
type DispatchOutcome = "sent" | "held" | "retryable" | "permanent";

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
    attempt_count: number;
    max_attempts: number;
}

interface PreferenceRow {
    email_enabled: boolean;
    sms_enabled: boolean;
    push_enabled: boolean;
    in_app_enabled: boolean;
    digest_frequency: string | null;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
    timezone: string | null;
}

/** Current minutes-since-midnight in an IANA zone (null when invalid). */
function minutesInZone(now: Date, timeZone: string | null): number | null {
    try {
        const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: timeZone ?? "UTC",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        }).formatToParts(now);
        const h = Number(parts.find((p) => p.type === "hour")?.value);
        const m = Number(parts.find((p) => p.type === "minute")?.value);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
        return h * 60 + m;
    } catch {
        return null;
    }
}

/**
 * Recipient gate: channel toggles, quiet hours (UTC, overnight-aware),
 * and digest cadence. Rows that fail the gate stay `pending` — the next
 * poll re-evaluates them, so quiet-hours holds release automatically.
 */
async function checkPreferences(
    supabase: ReturnType<typeof serviceClient>,
    notification: NotificationRow,
): Promise<{ ok: boolean; reason: string }> {
    if (!notification.recipient_id) return { ok: true, reason: "no recipient user" };
    const { data } = await supabase.from("notification_preferences")
        .select("email_enabled, sms_enabled, push_enabled, in_app_enabled, digest_frequency, quiet_hours_start, quiet_hours_end, timezone")
        .eq("organization_id", notification.organization_id)
        .eq("user_id", notification.recipient_id)
        .maybeSingle();
    const prefs = data as PreferenceRow | null;
    if (!prefs) return { ok: true, reason: "defaults" };

    const enabled =
        notification.channel === "email" ? prefs.email_enabled
            : notification.channel === "sms" ? prefs.sms_enabled
                : notification.channel === "push" ? prefs.push_enabled
                    : notification.channel === "in_app" ? prefs.in_app_enabled
                        : true; // webhook has no toggle
    if (!enabled) return { ok: false, reason: `${notification.channel} disabled by recipient` };

    if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
        const toMins = (t: string): number | null => {
            const m = /^(\d{2}):(\d{2})/.exec(t);
            if (!m) return null;
            return Number(m[1]) * 60 + Number(m[2]);
        };
        const start = toMins(prefs.quiet_hours_start);
        const end = toMins(prefs.quiet_hours_end);
        if (start !== null && end !== null && start !== end) {
            // Evaluated on the member's wall clock (NULL timezone = UTC).
            const mins = minutesInZone(new Date(), prefs.timezone);
            if (mins !== null) {
                const inWindow = start <= end
                    ? mins >= start && mins < end
                    : mins >= start || mins < end;
                if (inWindow) {
                    const where = prefs.timezone ?? "UTC";
                    return { ok: false, reason: `quiet hours (${where})` };
                }
            }
        }
    }

    const digest = prefs.digest_frequency ?? "immediate";
    if (digest !== "immediate" && ["email", "sms", "push"].includes(notification.channel)) {
        return { ok: false, reason: `held for ${digest} digest` };
    }
    return { ok: true, reason: "preferences pass" };
}

async function dispatchOne(
    supabase: ReturnType<typeof serviceClient>,
    notification: NotificationRow,
    variables: Record<string, unknown> = {},
): Promise<{ sent: boolean; reason: string; outcome: DispatchOutcome }> {
    const gate = await checkPreferences(supabase, notification);
    if (!gate.ok) return { sent: false, reason: gate.reason, outcome: "held" };

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
        return { sent: true, reason: `${notification.channel} stored`, outcome: "sent" };
    }

    if (!provider) {
        // Config may appear later; retried until max_attempts, then dead-lettered.
        return { sent: false, reason: `no ${notification.channel} provider configured`, outcome: "retryable" };
    }

    if (notification.channel === "email" && !notification.recipient_email) {
        await supabase.from("notifications").update({ subject, body, status: "failed" }).eq("id", notification.id);
        return { sent: false, reason: "missing recipient_email", outcome: "permanent" };
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
        return { sent: true, reason: `delivered via ${notification.channel} provider`, outcome: "sent" };
    } catch (err) {
        // Leave the row pending: the GET settle path schedules exponential
        // backoff and dead-letters after max_attempts — never an instant
        // terminal failure on a transient provider error.
        return {
            sent: false,
            reason: err instanceof Error ? err.message : "provider error",
            outcome: "retryable",
        };
    }
}

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return jsonResponse({ error: "Method not allowed" }, 405);

    const unauthorized = requireCronSecret(req);
    if (unauthorized) return unauthorized;

    const supabase = serviceClient();

    if (req.method === "GET") {
        // Wave 3: claim-based processing with leases + per-tenant fairness
        // (claim_notifications RPC: FOR UPDATE SKIP LOCKED, bounded per org)
        // instead of an unclaimed global poll that double-sends under load.
        const { data: claimed, error: claimErr } = await supabase.rpc("claim_notifications", {
            p_worker: WORKER_ID,
            p_batch: 50,
            p_per_org: 25,
            p_lease_seconds: 60,
        });
        if (claimErr) return jsonResponse({ error: claimErr.message }, 500);
        const outcomes: Record<string, unknown>[] = [];
        for (const row of (claimed ?? []) as NotificationRow[]) {
            // Settle exactly once: status guard on failure updates = idempotent
            // even if two workers somehow processed the same row.
            const res = await dispatchOne(supabase, row);
            if (res.outcome === "sent") {
                // Delivery recorded by dispatchOne (status already "sent");
                // release the lease by id — a status guard would not match.
                await supabase.from("notifications")
                    .update({ lease_owner: null, lease_expires_at: null })
                    .eq("id", row.id);
            } else if (res.outcome === "held") {
                // Preference gate (quiet hours / digest) — not a failure.
                // Keep the row pending without burning an attempt; the next
                // tick re-evaluates the window.
                await supabase.from("notifications")
                    .update({ lease_owner: null, lease_expires_at: null })
                    .eq("id", row.id)
                    .eq("status", "pending");
            } else if (res.outcome === "permanent") {
                // dispatchOne already marked it failed; just release the lease.
                await supabase.from("notifications")
                    .update({ lease_owner: null, lease_expires_at: null })
                    .eq("id", row.id);
                logEvent("error", "notification.permanent_failure", {
                    notification_id: row.id, organization_id: row.organization_id, reason: res.reason,
                });
            } else {
                // "retryable": exponential backoff, dead-letter at max_attempts.
                const attempt = (row.attempt_count ?? 0) + 1;
                const dead = attempt >= (row.max_attempts ?? 8);
                await supabase.from("notifications")
                    .update(dead
                        ? { status: "failed", attempt_count: attempt, lease_owner: null, lease_expires_at: null, next_attempt_at: null }
                        : { attempt_count: attempt, next_attempt_at: nextAttemptIso(attempt), lease_owner: null, lease_expires_at: null })
                    .eq("id", row.id)
                    .eq("status", "pending");
                logEvent(dead ? "error" : "warn", dead ? "notification.dead_letter" : "notification.retry_scheduled", {
                    notification_id: row.id, organization_id: row.organization_id, attempt, reason: res.reason,
                });
            }
            outcomes.push({ id: row.id, ...res });
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
