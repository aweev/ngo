/**
 * Shared helpers for the NGO OS execution runtime (Edge Functions).
 *
 * Every function in this runtime runs with the service-role key (RLS bypassed),
 * so each one MUST scope every query by organization_id explicitly and MUST
 * reject callers without the shared CRON_SECRET (see requireCronSecret).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

/** Service-role client. Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. */
export function serviceClient(): SupabaseClient {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Shared-secret gate. All runtime functions set `verify_jwt = false` in
 * config.toml (Scheduler has no user JWT), so this is the auth boundary.
 * Returns null when authorized, otherwise an error Response.
 */
export function requireCronSecret(req: Request): Response | null {
    const expected = Deno.env.get("CRON_SECRET");
    if (!expected) return jsonResponse({ error: "CRON_SECRET is not configured" }, 500);
    const provided = req.headers.get("x-cron-secret");
    if (provided !== expected) return jsonResponse({ error: "Unauthorized" }, 401);
    return null;
}

/** Absolute URL of a sibling function (uses the functions hostname). */
export function functionUrl(req: Request, name: string): string {
    return new URL(`/functions/v1/${name}`, req.url).toString();
}

/** Read a dot-path (e.g. "donation.amount") out of a JSON payload. */
export function getPath(obj: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((acc, key) => {
        if (acc !== null && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
            return (acc as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);
}

// ---------------------------------------------------------------------------
// Minimal cron support (minute hour day-of-month month day-of-week)
// ---------------------------------------------------------------------------

function parseCronField(field: string, min: number, max: number): Set<number> {
    const values = new Set<number>();
    const addRange = (from: number, to: number, step: number) => {
        for (let v = from; v <= to; v += step) {
            if (v >= min && v <= max) values.add(v);
        }
    };
    for (const part of field.split(",")) {
        if (part === "*") {
            addRange(min, max, 1);
        } else if (part.includes("/")) {
            const [range, stepRaw] = part.split("/");
            const step = Math.max(1, Number(stepRaw) || 1);
            if (range === "*") addRange(min, max, step);
            else if (range.includes("-")) {
                const [a, b] = range.split("-").map(Number);
                addRange(a, b, step);
            } else {
                addRange(Number(range), max, step);
            }
        } else if (part.includes("-")) {
            const [a, b] = part.split("-").map(Number);
            addRange(a, b, 1);
        } else {
            const v = Number(part);
            if (!Number.isNaN(v)) values.add(v);
        }
    }
    return values;
}

/** Next UTC run strictly after `from` for a 5-field cron expression. */
export function nextCronRun(expression: string, from: Date = new Date()): string | null {
    const fields = expression.trim().split(/\s+/);
    if (fields.length !== 5) return null;
    const [minF, hourF, domF, monF, dowF] = fields;
    const minutes = parseCronField(minF, 0, 59);
    const hours = parseCronField(hourF, 0, 23);
    const doms = parseCronField(domF, 1, 31);
    const months = parseCronField(monF, 1, 12);
    const dows = parseCronField(dowF, 0, 6);
    // Day match uses cron OR-semantics between dom and dow when both restricted.
    const domRestricted = domF !== "*";
    const dowRestricted = dowF !== "*";

    const candidate = new Date(from.getTime());
    candidate.setUTCSeconds(0, 0);
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);

    for (let i = 0; i < 525600; i++) {
        const minuteMatch = minutes.has(candidate.getUTCMinutes());
        const hourMatch = hours.has(candidate.getUTCHours());
        const monthMatch = months.has(candidate.getUTCMonth() + 1);
        const domMatch = doms.has(candidate.getUTCDate());
        const dowMatch = dows.has(candidate.getUTCDay());
        const dayMatch = domRestricted && dowRestricted ? domMatch || dowMatch : domMatch && dowMatch;
        if (minuteMatch && hourMatch && monthMatch && dayMatch) return candidate.toISOString();
        candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
    }
    return null;
}
