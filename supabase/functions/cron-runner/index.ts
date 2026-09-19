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
    corsHeaders,
    functionUrl,
    jsonResponse,
    nextCronRun,
    requireCronSecret,
    serviceClient,
} from "../_shared/runtime.ts";

const REPORTABLE_TABLES = new Set([
    "donations", "donors", "workers", "volunteers", "partners",
    "projects", "campaigns", "org_events", "expenses", "impact_metrics",
]);

async function postSibling(req: Request, name: string, body: Record<string, unknown>): Promise<void> {
    try {
        await fetch(functionUrl(req, name), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-cron-secret": req.headers.get("x-cron-secret") ?? "",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(25_000),
        });
    } catch {
        // Failures are captured on the job execution row by the caller.
    }
}

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "GET" && req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const unauthorized = requireCronSecret(req);
    if (unauthorized) return unauthorized;

    const supabase = serviceClient();
    const nowIso = new Date().toISOString();

    // Active jobs whose next_run_at has passed (or was never set for a
    // recurring schedule). Filtered in code to avoid PostgREST `or`
    // timestamp-parsing edge cases.
    const { data: activeJobs } = await supabase.from("scheduled_jobs").select("*")
        .eq("is_active", true)
        .order("next_run_at", { ascending: true, nullsFirst: true })
        .limit(25);

    const dueJobs = (activeJobs ?? []).filter((job) =>
        !job.next_run_at || (job.next_run_at as string) <= nowIso
    );

    const outcomes: Record<string, unknown>[] = [];

    for (const job of dueJobs ?? []) {
        const startedAt = Date.now();
        const { data: execution } = await supabase.from("job_executions").insert({
            organization_id: job.organization_id,
            job_id: job.id,
            status: "running",
            started_at: new Date().toISOString(),
            output: {},
        }).select("id").single();

        let status: "success" | "failure" | "skipped" = "success";
        let output: Record<string, unknown> = {};
        let errorMessage: string | null = null;
        const config = (job.config ?? {}) as Record<string, unknown>;

        try {
            switch (job.job_type as string) {
                case "automation": {
                    if (!config.rule_id) throw new Error("automation job is missing config.rule_id");
                    await postSibling(req, "automation-engine", {
                        rule_id: config.rule_id as string,
                        payload: { scheduled_job_id: job.id, triggered_at: nowIso },
                    });
                    output = { rule_id: config.rule_id };
                    break;
                }
                case "notification": {
                    await postSibling(req, "notification-dispatcher", {
                        organization_id: job.organization_id,
                        template_id: config.template_id,
                        recipient_email: config.recipient_email ?? null,
                        recipient_id: config.recipient_id ?? null,
                        variables: { ...(config.variables as Record<string, unknown> ?? {}), scheduled_job: job.name },
                        channel: config.channel ?? "email",
                    });
                    // Drain any other queued notifications while awake.
                    await fetch(functionUrl(req, "notification-dispatcher"), {
                        method: "GET",
                        headers: { "x-cron-secret": req.headers.get("x-cron-secret") ?? "" },
                        signal: AbortSignal.timeout(25_000),
                    }).catch(() => undefined);
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

        // Advance the schedule.
        let nextRun: string | null = null;
        if (job.schedule_type === "cron" && job.cron_expression) {
            nextRun = nextCronRun(job.cron_expression as string);
        } else if (job.schedule_type === "interval" && typeof config.interval_minutes === "number") {
            nextRun = new Date(Date.now() + (config.interval_minutes as number) * 60_000).toISOString();
        } else if (job.schedule_type === "one_shot") {
            nextRun = null;
        }

        await supabase.from("scheduled_jobs").update({
            last_run_at: nowIso,
            last_run_status: status,
            run_count: (job.run_count ?? 0) + 1,
            next_run_at: nextRun,
            // A finished one-shot job parks itself instead of firing again.
            ...(job.schedule_type === "one_shot" ? { is_active: false } : {}),
        }).eq("id", job.id);

        outcomes.push({ job_id: job.id, name: job.name, status, duration_ms: durationMs, error: errorMessage });
    }

    return jsonResponse({ ok: true, evaluated: (dueJobs ?? []).length, outcomes });
});
