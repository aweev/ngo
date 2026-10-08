/**
 * Observability primitives (audit Wave 3: OpenTelemetry, structured logs,
 * traces, SLOs, on-call alerting).
 *
 * The Edge runtime ships its own mirror (supabase/functions/_shared) — this
 * module is the Next.js counterpart. Everything emits one-line JSON so logs
 * stay greppable and SIEM-friendly, and every operation carries a
 * correlation id end to end.
 */

export type ObservabilityLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
    correlationId?: string;
    organizationId?: string | null;
    actorId?: string | null;
    durationMs?: number;
    [key: string]: unknown;
}

function sink(line: string, level: ObservabilityLevel): void {
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
}

/** Structured JSON log line. Never throws; logging must not break requests. */
export function logStructured(level: ObservabilityLevel, event: string, fields: LogFields = {}): void {
    try {
        sink(JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields }), level);
    } catch {
        /* logging is best-effort */
    }
}

/** Starts a timed operation; call .end() to emit duration + outcome. */
export function startSpan(event: string, fields: LogFields = {}) {
    const startedAt = Date.now();
    return {
        end: (outcome: 'ok' | 'error' = 'ok', extra: LogFields = {}) =>
            logStructured(outcome === 'ok' ? 'info' : 'error', event, {
                ...fields,
                ...extra,
                durationMs: Date.now() - startedAt,
                outcome,
            }),
    };
}

/** Propagates tracing headers (W3C traceparent + our correlation id). */
export function traceHeaders(correlationId: string, traceId?: string): Record<string, string> {
    const trace = traceId ?? correlationId.replace(/[^a-f0-9]/gi, '').slice(0, 32).padEnd(32, '0');
    return {
        'x-correlation-id': correlationId,
        traceparent: `00-${trace}-0000000000000001-01`,
    };
}

// ---------------------------------------------------------------------------
// SLOs (mirrored in docs/runbooks/incidents.md + /api/metrics alerts)
// ---------------------------------------------------------------------------

export interface SloDefinition {
    name: string;
    /** PromQL-style alert expression evaluated against /api/metrics. */
    alertWhen: string;
    /** How long the condition must hold before paging. */
    for: string;
    severity: 'page' | 'ticket';
}

export const SLOS: SloDefinition[] = [
    {
        name: 'outbox-drain',
        alertWhen: 'ngo_outbox_pending > 500',
        for: '15m',
        severity: 'page',
    },
    {
        name: 'dead-letter-growth',
        alertWhen: 'increase(ngo_outbox_dead[1h]) > 0 OR increase(ngo_jobs_dead_letter[1h]) > 0',
        for: '5m',
        severity: 'page',
    },
    {
        name: 'notification-backlog',
        alertWhen: 'ngo_notifications_pending > 1000',
        for: '30m',
        severity: 'ticket',
    },
    {
        name: 'webhook-unconfirmed',
        alertWhen: 'ngo_webhook_deliveries_unconfirmed > 100',
        for: '30m',
        severity: 'ticket',
    },
];

/** Renders the SLO set as Prometheus alert-rule YAML for ops handoff. */
export function slosAsPrometheusYaml(): string {
    const rules = SLOS.map(
        (s) =>
            `    - alert: NGO${s.name.replace(/[^a-zA-Z0-9]/g, '')}\n      expr: ${s.alertWhen}\n      for: ${s.for}\n      labels:\n        severity: ${s.severity}`,
    ).join('\n');
    return `groups:\n  - name: ngo-os\n    rules:\n${rules}\n`;
}
