/**
 * webhook-delivery — delivers organization events to outgoing webhooks.
 *
 * POST /functions/v1/webhook-delivery  (header: x-cron-secret)
 * Body:
 *   { "webhook_id": "<uuid>", "organization_id": "<uuid>",
 *     "event_type": "donation.created", "payload": { ... } }  — deliver now
 *   { "delivery_id": "<uuid>" }                               — retry one delivery
 *
 * Each attempt signs the body with HMAC-SHA256 (secret_token when set),
 * records a webhook_deliveries row, and updates the parent webhook counters.
 */
import { jsonResponse, requireCronSecret, serviceClient } from "../_shared/runtime.ts";

async function signBody(secret: string, body: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Stable idempotency key: same target + event + payload digest always maps
 * to ONE delivery row; redeliveries bump attempt_count instead of
 * duplicating history (audit Wave 3: idempotency everywhere).
 */
async function deliveryIdempotencyKey(webhookId: string, eventType: string, payload: unknown): Promise<string> {
    const canonical = JSON.stringify(payload ?? {});
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
    const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${webhookId}:${eventType}:${hex}`;
}

interface DeliveryTarget {
    id: string;
    organization_id: string;
    url: string;
    secret_token: string | null;
}

async function attemptDelivery(
    supabase: ReturnType<typeof serviceClient>,
    target: DeliveryTarget,
    eventType: string,
    payload: Record<string, unknown>,
    cronSecret: string,
    webhookIdForCounters: string,
): Promise<{ ok: boolean; status: number | null }> {
    const body = JSON.stringify({ event: eventType, delivered_at: new Date().toISOString(), payload });
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-ngo-event": eventType,
        "x-ngo-delivery": crypto.randomUUID(),
    };
    if (target.secret_token) {
        headers["x-ngo-signature"] = await signBody(target.secret_token, body);
    } else {
        // Shared-secret fallback so receivers can always authenticate the sender.
        headers["x-ngo-signature"] = await signBody(cronSecret, body);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let ok = false;
    try {
        const res = await fetch(target.url, { method: "POST", headers, body, signal: controller.signal });
        responseStatus = res.status;
        responseBody = (await res.text()).slice(0, 4000);
        ok = res.ok;
    } catch (err) {
        responseBody = err instanceof Error ? err.message.slice(0, 4000) : "delivery failed";
    } finally {
        clearTimeout(timeout);
    }

    // Idempotent recording: a redelivery bumps attempt_count on the SAME
    // row (unique (organization_id, idempotency_key)) instead of inserting
    // fresh history per attempt.
    const idempotencyKey = await deliveryIdempotencyKey(webhookIdForCounters, eventType, payload);
    const { data: existing } = await supabase.from("webhook_deliveries")
        .select("id, attempt_count")
        .eq("organization_id", target.organization_id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
    if (existing) {
        await supabase.from("webhook_deliveries").update({
            response_status: responseStatus,
            response_body: responseBody,
            attempt_count: (existing.attempt_count ?? 1) + 1,
            delivered_at: ok ? new Date().toISOString() : null,
        }).eq("id", existing.id);
    } else {
        const { error: recordError } = await supabase.from("webhook_deliveries").insert({
            organization_id: target.organization_id,
            webhook_id: webhookIdForCounters,
            event_type: eventType,
            payload,
            idempotency_key: idempotencyKey,
            response_status: responseStatus,
            response_body: responseBody,
            attempt_count: 1,
            delivered_at: ok ? new Date().toISOString() : null,
        });
        // 23505 = concurrent duplicate won the insert; recording must never
        // fail the delivery itself.
        if (recordError && recordError.code !== "23505") {
            console.log(JSON.stringify({
                ts: new Date().toISOString(),
                level: "warn",
                event: "webhook.delivery_record_failed",
                error: recordError.message,
            }));
        }
    }

    const { data: current } = await supabase.from("webhooks")
        .select("success_count, failure_count")
        .eq("id", webhookIdForCounters)
        .single();

    await supabase.from("webhooks").update({
        last_triggered_at: new Date().toISOString(),
        success_count: (current?.success_count ?? 0) + (ok ? 1 : 0),
        failure_count: (current?.failure_count ?? 0) + (ok ? 0 : 1),
    }).eq("id", webhookIdForCounters);

    return { ok, status: responseStatus };
}

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return jsonResponse({ error: "Method not allowed" }, 405);
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const unauthorized = requireCronSecret(req);
    if (unauthorized) return unauthorized;

    let body: {
        webhook_id?: string;
        organization_id?: string;
        event_type?: string;
        payload?: Record<string, unknown>;
        delivery_id?: string;
    };
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const supabase = serviceClient();
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

    // Retry path: re-deliver a single recorded delivery.
    if (body.delivery_id) {
        const { data: delivery } = await supabase.from("webhook_deliveries")
            .select("*, webhooks!inner(id, organization_id, url, secret_token, is_active)")
            .eq("id", body.delivery_id)
            .single();
        if (!delivery) return jsonResponse({ error: "Delivery not found" }, 404);
        const hook = delivery.webhooks as unknown as DeliveryTarget & { is_active: boolean };
        if (!hook.is_active) return jsonResponse({ error: "Webhook is inactive" }, 409);
        const result = await attemptDelivery(
            supabase, hook, delivery.event_type, delivery.payload as Record<string, unknown>, cronSecret, hook.id,
        );
        return jsonResponse({ ok: result.ok, status: result.status });
    }

    if (!body.event_type) return jsonResponse({ error: "event_type is required" }, 400);

    // Resolve targets: one webhook, or every active subscriber of the event.
    let targets: DeliveryTarget[] = [];
    if (body.webhook_id && body.organization_id) {
        const { data: hook } = await supabase.from("webhooks").select("id, organization_id, url, secret_token")
            .eq("id", body.webhook_id)
            .eq("organization_id", body.organization_id)
            .eq("is_active", true)
            .single();
        if (hook) targets = [hook as DeliveryTarget];
    } else if (body.organization_id) {
        const { data: hooks } = await supabase.from("webhooks").select("id, organization_id, url, secret_token")
            .eq("organization_id", body.organization_id)
            .eq("is_active", true)
            .contains("events", [body.event_type]);
        targets = (hooks ?? []) as DeliveryTarget[];
    } else {
        return jsonResponse({ error: "Provide delivery_id or webhook_id/organization_id" }, 400);
    }

    const payload = body.payload ?? {};
    const outcomes: Record<string, unknown>[] = [];
    for (const target of targets) {
        const result = await attemptDelivery(supabase, target, body.event_type, payload, cronSecret, target.id);
        outcomes.push({ webhook_id: target.id, ...result });
    }

    return jsonResponse({ ok: true, delivered: outcomes.filter((o) => (o as { ok: boolean }).ok).length, outcomes });
});
