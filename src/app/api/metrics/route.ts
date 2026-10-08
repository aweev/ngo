import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Prometheus text endpoint (audit Wave 3: observability / SLOs).
 * Gated by METRICS_TOKEN (env — never NEXT_PUBLIC). The incidents runbook
 * documents the scrape target and alert thresholds. Returns 404 when no
 * token is configured: metrics stay disabled instead of exposed.
 */
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
    const token = process.env.METRICS_TOKEN;
    if (!token) return false;
    const header = req.headers.get("authorization") ?? "";
    const provided = header.toLowerCase().startsWith("bearer ")
        ? header.slice(7).trim()
        : new URL(req.url).searchParams.get("token") ?? "";
    const a = Buffer.from(provided);
    const b = Buffer.from(token);
    return a.length === b.length && timingSafeEqual(a, b);
}

async function countRows(
    client: ReturnType<typeof createSupabaseAdminClient>,
    table: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apply?: (q: any) => any,
): Promise<number> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q: any = client.from(table).select("id", { count: "exact", head: true });
        if (apply) q = apply(q);
        const { count, error } = await q;
        return error ? -1 : (count ?? 0);
    } catch {
        return -1;
    }
}

async function collect(): Promise<string> {
    const admin = createSupabaseAdminClient();
    const since1h = new Date(Date.now() - 60 * 60_000).toISOString();

    const [outboxPending, outboxDead, jobsDead, jobsFailed, notifPending, notifFailed] = await Promise.all([
        countRows(admin, "outbox_events", (q) => q.eq("status", "pending")),
        countRows(admin, "outbox_events", (q) => q.eq("status", "dead")),
        countRows(admin, "scheduled_jobs", (q) => q.is("dead_lettered_at", "not", null)),
        countRows(admin, "scheduled_jobs", (q) => q.eq("last_run_status", "failure")),
        countRows(admin, "notifications", (q) => q.eq("status", "pending")),
        countRows(admin, "notifications", (q) => q.eq("status", "failed")),
    ]);

    let webhookUnconfirmed = -1;
    try {
        const { count, error } = await admin
            .from("webhook_deliveries")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since1h)
            .is("delivered_at", null);
        webhookUnconfirmed = error ? -1 : (count ?? 0);
    } catch {
        webhookUnconfirmed = -1;
    }

    const lines: string[] = [
        "# HELP ngo_outbox_pending Outbox events awaiting delivery.",
        "# TYPE ngo_outbox_pending gauge",
        `ngo_outbox_pending ${outboxPending}`,
        "# HELP ngo_outbox_dead Outbox events in the dead-letter state.",
        "# TYPE ngo_outbox_dead gauge",
        `ngo_outbox_dead ${outboxDead}`,
        "# HELP ngo_jobs_dead_letter Scheduled jobs dead-lettered (need a human).",
        "# TYPE ngo_jobs_dead_letter gauge",
        `ngo_jobs_dead_letter ${jobsDead}`,
        "# HELP ngo_jobs_last_run_failed Scheduled jobs whose last run failed.",
        "# TYPE ngo_jobs_last_run_failed gauge",
        `ngo_jobs_last_run_failed ${jobsFailed}`,
        "# HELP ngo_notifications_pending Notifications queued (all channels).",
        "# TYPE ngo_notifications_pending gauge",
        `ngo_notifications_pending ${notifPending}`,
        "# HELP ngo_notifications_failed Notifications permanently failed.",
        "# TYPE ngo_notifications_failed gauge",
        `ngo_notifications_failed ${notifFailed}`,
        "# HELP ngo_webhook_deliveries_unconfirmed Webhook deliveries created in the last hour without a confirmed success.",
        "# TYPE ngo_webhook_deliveries_unconfirmed gauge",
        `ngo_webhook_deliveries_unconfirmed ${webhookUnconfirmed}`,
    ];
    return lines.join("\n") + "\n";
}

export async function GET(req: Request): Promise<NextResponse> {
    if (!process.env.METRICS_TOKEN) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!authorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return new NextResponse(await collect(), {
        status: 200,
        headers: { "content-type": "text/plain; version=0.0.4; charset=utf-8" },
    });
}
