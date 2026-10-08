#!/usr/bin/env node
/**
 * Reliability gate (audit Wave 3) — static checks that the platform keeps:
 *   * atomic job/notification/outbox claiming (FOR UPDATE SKIP LOCKED)
 *   * retries with exponential backoff and a dead-letter state
 *   * idempotent side effects (webhook deliveries, outbox enqueue)
 *   * honest cron results (sibling failures never recorded as success)
 *   * the metrics endpoint the incidents runbook alerts on
 * Runs in CI (pnpm verify:reliability) alongside the other verify:* gates.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;

const read = (p) => {
    const abs = join(root, p);
    return existsSync(abs) ? readFileSync(abs, "utf8") : null;
};

function check(name, ok, detail = "") {
    const mark = ok ? "OK  " : "FAIL";
    if (!ok) failures += 1;
    console.log(`[${mark}] ${name}${!ok && detail ? ` — ${detail}` : ""}`);
}

// --- 1. Migration: claim RPCs + outbox schema --------------------------------
const migration = read("supabase/migrations/20260922000006_reliability_outbox.sql");
check("migration 20260922000006 exists", migration !== null);
if (migration) {
    check("job claiming uses FOR UPDATE SKIP LOCKED", migration.includes("FOR UPDATE SKIP LOCKED"));
    check("claim_due_jobs RPC present", migration.includes("claim_due_jobs"));
    check("claim_notifications RPC present", migration.includes("claim_notifications"));
    check("claim_outbox_events RPC present", migration.includes("claim_outbox_events"));
    check("outbox_events table with idempotency + dead state",
        migration.includes("CREATE TABLE IF NOT EXISTS outbox_events")
        && migration.includes("idempotency_key")
        && migration.includes("'dead'"));
    check("notifications claimable (lease + attempt columns)",
        migration.includes("lease_owner")
        && migration.includes("attempt_count")
        && migration.includes("next_attempt_at"));
}

// --- 2. cron-runner: claims, honest sibling results, dead-letter ------------
const cron = read("supabase/functions/cron-runner/index.ts");
check("cron-runner exists", cron !== null);
if (cron) {
    check("cron-runner claims jobs atomically", /claim_due_jobs|claimJobs|FOR UPDATE/.test(cron));
    check("cron-runner drains the outbox", cron.includes("outbox_events"));
    check("cron-runner branches on sibling result .ok", /\.ok\b/.test(cron) && cron.includes("postSibling"));
    check("cron-runner dead-letters exhausted jobs", /dead_letter/.test(cron));
    check("cron-runner schedules retries with backoff", /backoff|next_attempt_at/.test(cron));
}

// --- 3. notification-dispatcher: claims, not bare poll -----------------------
const dispatcher = read("supabase/functions/notification-dispatcher/index.ts");
check("notification-dispatcher exists", dispatcher !== null);
if (dispatcher) {
    check("dispatcher claims via claim_notifications RPC", dispatcher.includes("claim_notifications"));
    check("dispatcher reschedules with backoff on failure", dispatcher.includes("next_attempt_at"));
    check("dispatcher counts attempts (no infinite retry)", dispatcher.includes("attempt_count"));
    check("dispatcher has no unclaimed .limit poll", !/from\("notifications"\)[\s\S]{0,160}\.limit\(50\)/.test(dispatcher));
}

// --- 4. webhook-delivery: idempotent attempts --------------------------------
const webhook = read("supabase/functions/webhook-delivery/index.ts");
check("webhook-delivery exists", webhook !== null);
if (webhook) {
    check("webhook deliveries are idempotent", webhook.includes("idempotency_key"));
}

// --- 5. App-side modules + tests --------------------------------------------
check("src/lib/reliability.ts present", read("src/lib/reliability.ts") !== null);
check("src/lib/reliability.test.ts present", read("src/lib/reliability.test.ts") !== null);
check("orphan duplicate src/lib/outbox.ts removed", !existsSync(join(root, "src/lib/outbox.ts")));

// --- 6. Outbox producer wired into a real domain action ----------------------
const workflow = read("src/actions/content-workflow.ts");
check("content publish enqueues an outbox event", workflow !== null && workflow.includes("enqueueOutboxEvent"));

// --- 7. Metrics endpoint referenced by the incidents runbook -----------------
const metrics = read("src/app/api/metrics/route.ts");
check("/api/metrics exists", metrics !== null);
if (metrics) {
    check("metrics endpoint gated by METRICS_TOKEN", metrics.includes("METRICS_TOKEN"));
}
const incidents = read("docs/runbooks/incidents.md");
check("incidents runbook documents the metrics scrape + thresholds",
    incidents !== null
    && incidents.includes("/api/metrics")
    && incidents.includes("METRICS_TOKEN")
    && incidents.includes("ngo_outbox_dead"));

console.log("");
if (failures > 0) {
    console.error(`RELIABILITY GATE FAILED: ${failures} check(s) failing.`);
    process.exit(1);
}
console.log("OK: reliability invariants hold (claims, retries, dead-letter, idempotency, metrics).");
