/**
 * Public abuse-prevention controls (audit Wave 0, item 3).
 *
 * - Edge gate: when a CDN/WAF sits in front of the app it stamps
 *   `x-awe-edge-secret`; requests missing/with a wrong stamp were not filtered
 *   by the edge and are refused before any database work ("apply CDN/WAF
 *   limits first").
 * - Honeypot: hidden form fields that real users never see or fill and bots
 *   reliably do. Filled honeypot => reject before any database work.
 * - CAPTCHA: server-side verification of Cloudflare Turnstile / hCaptcha
 *   tokens. The site secret lives server-side only; a token is verified
 *   against the provider's siteverify endpoint and must pass, fail-closed on
 *   network errors.
 * - Risk scoring + alerting: cheap signals (honeypot, CAPTCHA failure, rate
 *   limiting, edge mismatch) are scored 0–100 and, above
 *   ABUSE_ALERT_MIN_SCORE, POSTed PII-free to ABUSE_ALERT_WEBHOOK_URL.
 *
 * Configuration (all optional, .env.example documents them):
 *   TURNSTILE_SECRET_KEY    enables Turnstile verification
 *   HCAPTCHA_SECRET_KEY     enables hCaptcha verification (Turnstile wins if both set)
 *   PUBLIC_CAPTCHA_MODE     'required' rejects submissions without a token
 *   EDGE_SHARED_SECRET      shared secret the CDN/WAF echoes on every request
 *   ABUSE_ALERT_WEBHOOK_URL ops webhook that receives abuse alerts
 *   ABUSE_ALERT_MIN_SCORE   risk score at which an alert is sent (default 50)
 *
 * Plain server module (NOT 'use server') — never expose verifiers as actions.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const HCAPTCHA_VERIFY_URL = 'https://api.hcaptcha.com/siteverify';

/** Header the CDN/WAF stamps once it has accepted a request (edge gate). */
export const EDGE_SECRET_HEADER = 'x-awe-edge-secret';

/** Field real users cannot see; bots that auto-fill every input will trip it. */
export const HONEYPOT_FIELD = 'company_website';

export function honeypotTripped(data: Record<string, unknown>): boolean {
    const value = data[HONEYPOT_FIELD];
    return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

/** Constant-time comparison that never throws on a length mismatch. */
function safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

/**
 * First line of defense ("apply CDN/WAF limits first"): when
 * EDGE_SHARED_SECRET is configured, the edge must have stamped
 * `x-awe-edge-secret` on the request. A request that reached the origin
 * directly (scanner, cache-bypass, leaked origin IP) is refused before any
 * database work.
 *
 * With no secret configured the gate is disabled and returns ok, so a
 * deployment without a CDN keeps working — the distributed limiter is then
 * the first line.
 */
export function verifyEdgeSecret(headerValue: string | null | undefined): HumanVerificationResult {
    const secret = process.env.EDGE_SHARED_SECRET?.trim();
    if (!secret) return { ok: true };
    if (!headerValue) return { ok: false, reason: 'Request did not pass through the edge.' };
    return safeEqual(headerValue, secret)
        ? { ok: true }
        : { ok: false, reason: 'Request did not pass through the edge.' };
}

/** Cheap suspicion signals raised by public intake. */
export type AbuseSignal =
    | 'honeypot'
    | 'captcha_failed'
    | 'captcha_unconfigured'
    | 'rate_limited'
    | 'edge_gate_failed'
    | 'self_identified_bot';

const SIGNAL_WEIGHTS: Record<AbuseSignal, number> = {
    self_identified_bot: 75,
    honeypot: 60,
    edge_gate_failed: 50,
    captcha_failed: 45,
    rate_limited: 40,
    captcha_unconfigured: 25,
};

export interface RiskAssessment {
    /** 0–100; higher is more suspicious. */
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    signals: AbuseSignal[];
}

export function riskLevel(score: number): RiskAssessment['level'] {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
}

/**
 * Pure risk scoring so behaviour is unit-testable without a request. Signals
 * compound (strongest signal, plus half the weight of the others) but
 * saturate at 100.
 */
export function computeRiskScore(signals: readonly AbuseSignal[]): RiskAssessment {
    const unique = [...new Set(signals)];
    const weights = unique.map((signal) => SIGNAL_WEIGHTS[signal]).sort((a, b) => b - a);
    const score = weights.length === 0
        ? 0
        : Math.min(100, weights[0] + Math.round(weights.slice(1).reduce((sum, w) => sum + w, 0) / 2));

    return { score, level: riskLevel(score), signals: unique };
}

/**
 * One-way identity for throttles and alerts. Raw emails/IPs must never be
 * stored in the rate-limit table or shipped to an alerting webhook, so both
 * are reduced to a salted SHA-256 digest (data minimisation, Wave 1).
 */
export function hashThrottleIdentity(value: string): string {
    // Phase 0: the service-role key must never double as a hash salt —
    // a leaked throttle digest must not become an oracle on the master key.
    const salt = process.env.ABUSE_HASH_SALT;
    if (!salt && process.env.NODE_ENV === 'production') {
        console.warn('[abuse-prevention] ABUSE_HASH_SALT is not set; using an insecure dev fallback. Set a random salt.');
    }
    return createHash('sha256').update(`${salt ?? 'ngo-os-insecure-dev-only'}:${value.trim().toLowerCase()}`, 'utf8').digest('hex');
}

export interface AbuseAlert {
    surface: string;
    /** Already-hashed identity (never a raw email/IP). */
    identity?: string;
    signals: readonly AbuseSignal[];
}

/**
 * Abuse alerting (audit Wave 0, item 3). Posts a compact, PII-free event to
 * the configured operations webhook when the risk score reaches
 * ABUSE_ALERT_MIN_SCORE (default 50). Fire-and-forget by design: an alerting
 * outage must never turn into a user-facing failure.
 */
export async function alertAbuse(alert: AbuseAlert): Promise<RiskAssessment> {
    const risk = computeRiskScore(alert.signals);
    const configuredMinimum = Number.parseInt(process.env.ABUSE_ALERT_MIN_SCORE ?? '50', 10);
    const minimum = Number.isFinite(configuredMinimum) ? configuredMinimum : 50;
    const webhook = process.env.ABUSE_ALERT_WEBHOOK_URL?.trim();

    if (!webhook || risk.score < minimum) return risk;

    const body = JSON.stringify({
        source: 'ngo-os/public-intake',
        surface: alert.surface,
        identity: alert.identity ?? null,
        risk: risk.score,
        level: risk.level,
        signals: risk.signals,
        at: new Date().toISOString(),
    });

    try {
        await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: AbortSignal.timeout(3_000),
        });
    } catch (err) {
        console.warn(
            '[abuse-prevention] abuse alert webhook failed:',
            err instanceof Error ? err.message : String(err),
        );
    }

    return risk;
}

export interface HumanVerificationResult {
    ok: boolean;
    reason?: string;
}

export interface HumanVerificationInput {
    /** CAPTCHA widget token, when the frontend renders one. */
    captchaToken?: unknown;
    /** Best-effort client IP for provider risk checks. */
    ip?: string;
    /** Intake surface used in abuse alerts (form, donation, newsletter, ...). */
    surface?: string;
    /** Already-hashed identity for abuse alerts (never a raw email/IP). */
    identity?: string;
}

/**
 * Verifies a CAPTCHA token against the configured provider.
 * Turnstile is preferred when both secrets are configured.
 */
export async function verifyCaptchaToken(
    token: string,
    ip?: string,
): Promise<HumanVerificationResult> {
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim();
    const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY?.trim();
    const secret = turnstileSecret || hcaptchaSecret;
    if (!secret) {
        // No provider configured: a token cannot be verified, so it must not
        // be treated as proof of humanity.
        return { ok: false, reason: 'CAPTCHA is not configured on this deployment.' };
    }

    const endpoint = turnstileSecret ? TURNSTILE_VERIFY_URL : HCAPTCHA_VERIFY_URL;
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set('remoteip', ip);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
            signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) {
            return { ok: false, reason: 'CAPTCHA verification service error.' };
        }
        const result = (await response.json()) as { success?: boolean };
        if (result.success !== true) {
            return { ok: false, reason: 'CAPTCHA verification failed.' };
        }
        return { ok: true };
    } catch {
        // Fail closed: an unreachable verifier must never be an open door.
        return { ok: false, reason: 'CAPTCHA verification is unavailable.' };
    }
}

/**
 * Combined gate for public intake submissions: honeypot first (cheap and
 * local), then CAPTCHA when a token was provided or when the deployment
 * requires one. Every failure raises a risk-scored abuse alert.
 */
export async function verifyHuman(
    data: Record<string, unknown>,
    options: HumanVerificationInput = {},
): Promise<HumanVerificationResult> {
    const surface = options.surface ?? 'public-intake';

    if (honeypotTripped(data)) {
        await alertAbuse({ surface, identity: options.identity, signals: ['honeypot'] });
        return { ok: false, reason: 'Submission rejected.' };
    }

    const token = typeof options.captchaToken === 'string' && options.captchaToken.length > 0
        ? options.captchaToken
        : null;

    if (!token) {
        if (process.env.PUBLIC_CAPTCHA_MODE === 'required') {
            await alertAbuse({ surface, identity: options.identity, signals: ['captcha_unconfigured'] });
            return { ok: false, reason: 'Please complete the human verification.' };
        }
        return { ok: true };
    }

    const result = await verifyCaptchaToken(token, options.ip);
    if (!result.ok) {
        await alertAbuse({ surface, identity: options.identity, signals: ['captcha_failed'] });
    }
    return result;
}
