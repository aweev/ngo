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
import { corsHeaders, jsonResponse, requireCronSecret, serviceClient } from "../_shared/runtime.ts";

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

    await supabase.from("webhook_deliveries").insert({
        organization_id: target.organization_id,
        webhook_id: webhookIdForCounters,
        event_type: eventType,
        payload,
        response_status: responseStatus,
        response_body: responseBody,
        attempt_count: 1,
        delivered_at: ok ? new Date().toISOString() : null,
    });

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
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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
