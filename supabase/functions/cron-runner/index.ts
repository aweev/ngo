/**
 * cron-runner — executes due scheduled_jobs. Intended to be invoked every
 * minute by pg_cron / Supabase Scheduled Webhooks:
 *
 *   select net.http_post(
 *     url := 'https://<ref>.supabase.co/functions/v1/cron-runner',
 *     headers := '{"x-cron-secret": "<CRON_SECRET>"}'::jsonb
 *   );
 *
 * GET /functions/v1/cron-runner  (header: x-cron-secret)
 *
 * For each due job (is_active, next_run_at <= now, or recurring cron without
 * a next_run_at) it writes a job_executions lifecycle row, fans out by
 * job_type, then stamps last_run_*, run_count, and the following next_run_at.
 */
import {
    functionUrl,
    jsonResponse,
    nextCronRun,
    requireCronSecret,
    serviceClient,
} from "../_shared/runtime.ts";
import {
    logEvent,
    nextAttemptIso,
    postSibling,
    type SiblingResult,
} from "../_shared/reliability.ts";

// Operational tables plus the Wave 3 reporting READ MODELS (aggregates —
// scheduled reports snapshot these instead of broad operational money rows).
const REPORTABLE_TABLES = new Set([
    "donations", "donors", "workers", "volunteers", "partners",
    "projects", "campaigns", "org_events", "expenses", "impact_metrics",
    "reporting_donations_monthly", "reporting_expenses_monthly",
]);

/** Worker identity for leases (unique per invocation). */
const WORKER_ID = `cron-${crypto.randomUUID()}`;

/**
 * Calls a sibling function through the shared reliability helper: never
 * throws, returns { ok }. Callers MUST branch on .ok — the audit flagged the
 * old cron for marking work successful when downstream work failed.
 */
function callSibling(req: Request, name: string, body: Record<string, unknown>): Promise<SiblingResult> {
    return postSibling(
        Deno.env.get("SUPABASE_URL") ?? "",
        name,
        req.headers.get("x-cron-secret") ?? "",
        body,
        25_000,
    );
}

/**
 * Drains the transactional outbox (audit Wave 3): claims due events with
 * FOR UPDATE SKIP LOCKED + per-tenant fairness + expiring leases, routes
 * each to its downstream consumer, and records delivered / retry /
 * dead-letter on the shared backoff curve.
 *
 * Routing convention: every outbox event is also a webhook business event —
 * webhook-delivery resolves active subscribers for the event type and
 * no-ops cleanly when there are none, so a producer like
 * `content.page_locale_published` fans out to exactly the hooks that
 * subscribed to it. Other consumers (notification fanout, exports) attach
 * here as prefixes are added — unknown types fail loudly, retry, and land
 * in the dead-letter queue rather than being dropped.
 */
async function drainOutbox(
    req: Request,
    supabase: ReturnType<typeof serviceClient>,
): Promise<Record<string, unknown>[]> {
    const { data: events, error } = await supabase.rpc("claim_outbox_events", {
        p_worker: WORKER_ID,
        p_batch: 25,
        p_per_org: 5,
        p_lease_seconds: 60,
    });
    if (error) {
        logEvent("error", "cron.outbox_claim_failed", { error: error.message });
        return [];
    }

    const results: Record<string, unknown>[] = [];
    for (const ev of events ?? []) {
        const attempts = ((ev.attempts as number | undefined) ?? 0) + 1;
        const maxAttempts = (ev.max_attempts as number | undefined) ?? 8;

        const call = await callSibling(req, "webhook-delivery", {
            organization_id: ev.organization_id,
            event_type: ev.event_type,
            payload: ev.payload ?? {},
        });
        if (call.ok) {
            await supabase.from("outbox_events").update({
                status: "delivered",
                attempts,
                delivered_at: new Date().toISOString(),
                lease_owner: null,
                lease_expires_at: null,
                last_error: null,
            }).eq("id", ev.id);
            results.push({ id: ev.id, event_type: ev.event_type, status: "delivered" });
            continue;
        }

        const message = (call.error ?? `webhook-delivery HTTP ${call.status}`).slice(0, 500);
        const dead = attempts >= maxAttempts;
        const patch: Record<string, unknown> = {
            status: dead ? "dead" : "pending",
            attempts,
            last_error: message,
            lease_owner: null,
            lease_expires_at: null,
        };
        // Retries become due on the backoff curve; dead rows are only ever
        // cleared by an operator (reactivate after triage).
        if (!dead) patch.available_at = nextAttemptIso(attempts, 1_000);
        await supabase.from("outbox_events").update(patch).eq("id", ev.id);
        logEvent(dead ? "error" : "warn", dead ? "cron.outbox_dead" : "cron.outbox_retry", {
            outbox_id: ev.id,
            event_type: ev.event_type,
            attempts,
            max_attempts: maxAttempts,
            error: message,
        });
        results.push({ id: ev.id, event_type: ev.event_type, status: dead ? "dead" : "retry", error: message });
    }
    return results;
}

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return jsonResponse({ error: "Method not allowed" }, 405);
    if (req.method !== "GET" && req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const unauthorized = requireCronSecret(req);
    if (unauthorized) return unauthorized;

    const supabase = serviceClient();
    const nowIso = new Date().toISOString();

    // Atomically claim due jobs: FOR UPDATE SKIP LOCKED + per-tenant fairness
    // + expiring leases (audit Wave 3). Replaces the old global `limit(25)`
    // poll that could starve tenants and double-fire leased work.
    const { data: dueJobs, error: claimError } = await supabase.rpc("claim_due_jobs", {
        p_worker: WORKER_ID,
        p_batch: 25,
        p_per_org: 3,
        p_lease_seconds: 300,
    });
    if (claimError) {
        logEvent("error", "cron.claim_failed", { error: claimError.message });
        return jsonResponse({ ok: false, error: claimError.message }, 500);
    }

    const outcomes: Record<string, unknown>[] = [];

    for (const job of dueJobs ?? []) {
        const startedAt = Date.now();
        const attempt = (job.attempt_count ?? 0) + 1;
        const slotKey = (job.next_run_at as string | null) ?? nowIso;
        const { data: execution, error: execError } = await supabase.from("job_executions").insert({
            organization_id: job.organization_id,
            job_id: job.id,
            status: "running",
            attempt,
            dedupe_key: `${job.id}:${slotKey}:${attempt}`,
            started_at: new Date().toISOString(),
            output: {},
        }).select("id").single();
        if (execError) {
            // Unique violation = this slot+attempt already ran (double cron
            // tick); never record the same execution twice.
            if (execError.code !== "23505") {
                logEvent("warn", "cron.execution_insert_failed", { job_id: job.id, error: execError.message });
            }
            await supabase.from("scheduled_jobs")
                .update({ lease_owner: null, lease_expires_at: null })
                .eq("id", job.id).eq("lease_owner", WORKER_ID);
            continue;
        }

        let status: "success" | "failure" | "skipped" = "success";
        let output: Record<string, unknown> = {};
        let errorMessage: string | null = null;
        const config = (job.config ?? {}) as Record<string, unknown>;

        try {
            switch (job.job_type as string) {
                case "automation": {
                    if (!config.rule_id) throw new Error("automation job is missing config.rule_id");
                    const call = await callSibling(req, "automation-engine", {
                        rule_id: config.rule_id as string,
                        payload: { scheduled_job_id: job.id, triggered_at: nowIso },
                    });
                    if (!call.ok) throw new Error(call.error ?? `automation-engine HTTP ${call.status}`);
                    output = { rule_id: config.rule_id };
                    break;
                }
                case "notification": {
                    const call = await callSibling(req, "notification-dispatcher", {
                        organization_id: job.organization_id,
                        template_id: config.template_id,
                        recipient_email: config.recipient_email ?? null,
                        recipient_id: config.recipient_id ?? null,
                        variables: { ...(config.variables as Record<string, unknown> ?? {}), scheduled_job: job.name },
                        channel: config.channel ?? "email",
                    });
                    if (!call.ok) throw new Error(call.error ?? `notification-dispatcher HTTP ${call.status}`);
                    // Advisory: drain any other queued notifications while awake.
                    // The dispatcher claims rows with leases, so a missed drain
                    // only delays them until the next tick.
                    const drained = await fetch(functionUrl(req, "notification-dispatcher"), {
                        method: "GET",
                        headers: { "x-cron-secret": req.headers.get("x-cron-secret") ?? "" },
                        signal: AbortSignal.timeout(25_000),
                    }).then((r) => r.ok).catch(() => false);
                    if (!drained) {
                        logEvent("warn", "cron.notification_drain_missed", { job_id: job.id });
                    }
                    output = { template_id: config.template_id ?? null };
                    break;
                }
                case "report": {
                    const reportId = config.report_id as string | undefined;
                    if (!reportId) throw new Error("report job is missing config.report_id");
                    const { data: report } = await supabase.from("report_definitions").select("*")
                        .eq("id", reportId)
                        .eq("organization_id", job.organization_id)
                        .single();
                    if (!report) throw new Error("report definition not found");
                    if (!REPORTABLE_TABLES.has(report.entity_type)) {
                        throw new Error(`unknown report entity: ${report.entity_type}`);
                    }
                    const { data: rows, error: fetchError } = await supabase.from(report.entity_type)
                        .select("*")
                        .eq("organization_id", job.organization_id)
                        .limit(100);
                    if (fetchError) throw new Error(fetchError.message);
                    await supabase.from("report_snapshots").insert({
                        organization_id: job.organization_id,
                        report_id: report.id,
                        name: `${report.name} — scheduled (${nowIso.slice(0, 10)})`,
                        row_count: rows?.length ?? 0,
                        data: rows ?? [],
                    });
                    output = { report_id: reportId, row_count: rows?.length ?? 0 };
                    break;
                }
                case "export":
                case "sync":
                case "custom": {
                    // No external side effect yet — recorded so operators can see
                    // the schedule is alive; wire provider logic here as needed.
                    status = "skipped";
                    output = { reason: `${job.job_type} jobs have no handler yet`, config };
                    break;
                }
                default:
                    throw new Error(`unknown job_type: ${job.job_type}`);
            }
        } catch (err) {
            status = "failure";
            errorMessage = err instanceof Error ? err.message : "Unknown job error";
        }

        const durationMs = Date.now() - startedAt;
        if (execution) {
            await supabase.from("job_executions").update({
                status,
                completed_at: new Date().toISOString(),
                duration_ms: durationMs,
                output,
                error_message: errorMessage,
            }).eq("id", execution.id);
        }

        // Compute the natural next slot (only advanced on success/skip —
        // failures retry the SAME slot with exponential backoff instead of
        // silently moving on: audit Wave 3 retry/dead-letter semantics).
        let nextRun: string | null = null;
        if (job.schedule_type === "cron" && job.cron_expression) {
            nextRun = nextCronRun(job.cron_expression as string);
        } else if (job.schedule_type === "interval" && typeof config.interval_minutes === "number") {
            nextRun = new Date(Date.now() + (config.interval_minutes as number) * 60_000).toISOString();
        } else if (job.schedule_type === "one_shot") {
            nextRun = null;
        }

        const failed = status === "failure";
        const maxAttempts = (job.max_attempts as number | undefined) ?? 5;
        const willRetry = failed && attempt < maxAttempts;
        const deadLettered = failed && !willRetry;

        const update: Record<string, unknown> = {
            last_run_at: nowIso,
            run_count: (job.run_count ?? 0) + 1,
            // Always release the lease — otherwise the job stays unclaimable
            // until lease_expires_at even though it just finished.
            lease_owner: null,
            lease_expires_at: null,
        };
        if (willRetry) {
            // Retry the SAME schedule slot after a backoff; claim_due_jobs
            // only re-picks the row once next_attempt_at is due.
            update.attempt_count = attempt;
            update.next_attempt_at = nextAttemptIso(attempt, 5_000);
            update.last_run_status = "failure";
            update.next_run_at = job.next_run_at ?? nowIso;
            logEvent("warn", "cron.job_retry", { job_id: job.id, name: job.name, attempt, max_attempts: maxAttempts, error: errorMessage });
        } else if (deadLettered) {
            // Terminal: park the job so an operator triages it — a
            // dead-letter queue instead of silent infinite failures.
            update.attempt_count = attempt;
            update.last_run_status = "dead_letter";
            update.dead_lettered_at = nowIso;
            update.is_active = false;
            update.next_attempt_at = null;
            update.next_run_at = nextRun;
            logEvent("error", "cron.job_dead_letter", { job_id: job.id, name: job.name, attempts: attempt, error: errorMessage });
        } else {
            // Success or skipped: advance the schedule and reset retry state.
            update.attempt_count = 0;
            update.next_attempt_at = null;
            update.next_run_at = nextRun;
            update.last_run_status = status;
            if (job.dead_lettered_at) update.dead_lettered_at = null;
            // A finished one-shot job parks itself instead of firing again.
            if (job.schedule_type === "one_shot") update.is_active = false;
        }

        await supabase.from("scheduled_jobs").update(update).eq("id", job.id);

        outcomes.push({ job_id: job.id, name: job.name, status, attempt, willRetry, deadLettered, duration_ms: durationMs, error: errorMessage });
    }

    // Drain the transactional outbox alongside scheduled jobs so every
    // enqueued side effect is delivered, retried, or dead-lettered.
    const outboxResults = await drainOutbox(req, supabase);

    return jsonResponse({
        ok: true,
        evaluated: (dueJobs ?? []).length,
        outcomes,
        outbox: { processed: outboxResults.length, results: outboxResults },
    });
});
