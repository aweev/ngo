/**
 * automation-engine — evaluates enabled automation rules and executes actions.
 *
 * POST /functions/v1/automation-engine  (header: x-cron-secret)
 * Body:
 *   { "rule_id": "<uuid>" }                                   — run one rule
 *   { "event": "donation.created", "organization_id": "<uuid>",
 *     "payload": { ... } }                                    — fire event rules
 *
 * Condition operators mirror the admin AutomationRuleBuilder:
 * eq | ne | gt | lt | gte | lte | contains | not_contains | is_empty | is_not_empty
 *
 * Supported actions:
 *   send_notification / send_email -> inserts a pending notification row
 *   trigger_webhook               -> inserts a pending webhook delivery row
 *   start_workflow                -> inserts a running workflow instance
 *   create_task / update_field / create_record / custom -> recorded, no side effect
 */
import {
    corsHeaders,
    functionUrl,
    getPath,
    jsonResponse,
    requireCronSecret,
    serviceClient,
} from "../_shared/runtime.ts";

interface AutomationCondition {
    field: string;
    operator: string;
    value?: unknown;
    logic?: "and" | "or";
}

interface AutomationAction {
    type: string;
    config: Record<string, unknown>;
    delay_seconds?: number;
}

function evaluateCondition(condition: AutomationCondition, payload: Record<string, unknown>): boolean {
    const actual = getPath(payload, condition.field);
    const expected = condition.value;
    switch (condition.operator) {
        case "eq": return actual === expected;
        case "ne": return actual !== expected;
        case "gt": return Number(actual) > Number(expected);
        case "lt": return Number(actual) < Number(expected);
        case "gte": return Number(actual) >= Number(expected);
        case "lte": return Number(actual) <= Number(expected);
        case "contains":
            if (Array.isArray(actual)) return actual.includes(expected);
            return String(actual ?? "").includes(String(expected ?? ""));
        case "not_contains":
            if (Array.isArray(actual)) return !actual.includes(expected);
            return !String(actual ?? "").includes(String(expected ?? ""));
        case "is_empty":
            return actual === undefined || actual === null || actual === "" ||
                (Array.isArray(actual) && actual.length === 0);
        case "is_not_empty": return !(
            actual === undefined || actual === null || actual === "" ||
            (Array.isArray(actual) && actual.length === 0)
        );
        default: return false;
    }
}

function evaluateConditions(
    conditions: AutomationCondition[] | null | undefined,
    payload: Record<string, unknown>,
): boolean {
    if (!conditions || conditions.length === 0) return true;
    let result = evaluateCondition(conditions[0], payload);
    for (let i = 1; i < conditions.length; i++) {
        const next = evaluateCondition(conditions[i], payload);
        result = (conditions[i].logic ?? "and") === "or" ? result || next : result && next;
    }
    return result;
}

Deno.serve(async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const unauthorized = requireCronSecret(req);
    if (unauthorized) return unauthorized;

    let body: { rule_id?: string; event?: string; organization_id?: string; payload?: Record<string, unknown> };
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
    const payload = body.payload ?? {};

    const supabase = serviceClient();

    // Resolve candidate rules (always organization-scoped, always enabled-only).
    let rulesQuery = supabase.from("automation_rules").select("*").eq("is_enabled", true);
    if (body.rule_id) {
        rulesQuery = rulesQuery.eq("id", body.rule_id);
    } else if (body.event && body.organization_id) {
        rulesQuery = rulesQuery
            .eq("organization_id", body.organization_id)
            .eq("trigger_type", "event");
    } else {
        return jsonResponse({ error: "Provide either rule_id or event + organization_id" }, 400);
    }

    const { data: rules, error: rulesError } = await rulesQuery;
    if (rulesError) return jsonResponse({ error: "Unable to load automation rules" }, 500);

    const candidates = (rules ?? []).filter((rule) => {
        if (body.rule_id) return true;
        const configured = (rule.trigger_config as Record<string, unknown> | null)?.event;
        return configured === body.event;
    });

    const results: Record<string, unknown>[] = [];

    for (const rule of candidates) {
        const startedAt = new Date().toISOString();
        const conditions = (rule.conditions ?? []) as AutomationCondition[];
        const matched = evaluateConditions(conditions, payload);

        if (!matched) {
            const { data: skipped } = await supabase.from("automation_executions").insert({
                organization_id: rule.organization_id,
                rule_id: rule.id,
                status: "skipped",
                trigger_data: payload,
                results: { reason: "conditions_not_met" },
                started_at: startedAt,
                completed_at: new Date().toISOString(),
            }).select("id").single();
            results.push({ rule_id: rule.id, status: "skipped", execution_id: skipped?.id ?? null });
            continue;
        }

        const actionResults: Record<string, unknown>[] = [];
        let status: "success" | "failure" = "success";
        let errorMessage: string | null = null;
        const actions = (rule.actions ?? []) as AutomationAction[];

        try {
            for (const action of actions) {
                const config = action.config ?? {};
                switch (action.type) {
                    case "send_notification":
                    case "send_email": {
                        const { error } = await supabase.from("notifications").insert({
                            organization_id: rule.organization_id,
                            recipient_id: (config.recipient_id as string | undefined) ?? null,
                            recipient_email: (config.recipient_email as string | undefined) ?? null,
                            template_id: (config.template_id as string | undefined) ?? null,
                            channel: (config.channel as string | undefined) ?? "email",
                            subject: (config.subject as string | undefined) ?? null,
                            body: (config.body as string | undefined) ?? `Automation "${rule.name}" fired.`,
                            status: "pending",
                            entity_type: (config.entity_type as string | undefined) ?? null,
                            entity_id: (config.entity_id as string | undefined) ?? null,
                        });
                        if (error) throw new Error(`notification insert failed: ${error.message}`);
                        actionResults.push({ type: action.type, status: "queued" });
                        break;
                    }
                    case "trigger_webhook": {
                        const { error } = await supabase.from("webhook_deliveries").insert({
                            organization_id: rule.organization_id,
                            webhook_id: config.webhook_id as string,
                            event_type: body.event ?? "automation.fired",
                            payload: { ...payload, rule_id: rule.id, rule_name: rule.name },
                            attempt_count: 0,
                        });
                        if (error) throw new Error(`webhook queue failed: ${error.message}`);
                        // Fan out to the delivery worker (fire-and-forget).
                        fetch(functionUrl(req, "webhook-delivery"), {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "x-cron-secret": req.headers.get("x-cron-secret") ?? "",
                            },
                            body: JSON.stringify({
                                webhook_id: config.webhook_id,
                                organization_id: rule.organization_id,
                                event_type: body.event ?? "automation.fired",
                                payload,
                            }),
                        }).catch(() => undefined);
                        actionResults.push({ type: action.type, status: "dispatched" });
                        break;
                    }
                    case "start_workflow": {
                        const { error } = await supabase.from("workflow_instances").insert({
                            organization_id: rule.organization_id,
                            definition_id: config.workflow_definition_id as string,
                            status: "running",
                            current_step_index: 0,
                            context_data: payload,
                            step_history: [],
                            started_at: new Date().toISOString(),
                        });
                        if (error) throw new Error(`workflow start failed: ${error.message}`);
                        actionResults.push({ type: action.type, status: "started" });
                        break;
                    }
                    default: {
                        // create_task / update_field / create_record / custom:
                        // recorded for audit; no external side effect in this worker.
                        actionResults.push({ type: action.type, status: "recorded", config });
                    }
                }
            }
        } catch (err) {
            status = "failure";
            errorMessage = err instanceof Error ? err.message : "Unknown automation error";
        }

        const { data: execution } = await supabase.from("automation_executions").insert({
            organization_id: rule.organization_id,
            rule_id: rule.id,
            status,
            trigger_data: payload,
            results: { actions: actionResults },
            error_message: errorMessage,
            started_at: startedAt,
            completed_at: new Date().toISOString(),
        }).select("id").single();

        await supabase.from("automation_rules").update({
            run_count: (rule.run_count ?? 0) + 1,
            last_run_at: new Date().toISOString(),
            last_run_status: status,
        }).eq("id", rule.id);

        results.push({ rule_id: rule.id, status, execution_id: execution?.id ?? null, actions: actionResults.length });
    }

    return jsonResponse({ ok: true, evaluated: candidates.length, results });
});
