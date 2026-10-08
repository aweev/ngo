import { z } from "zod";

// 1. Define the Schema
const envSchema = z.object({
    // Public (Client & Server)
    NEXT_PUBLIC_APP_URL: z.string().url(),

    // Supabase (Public)
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

    // Supabase (Server Only - Service Role Key)
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

    // Server Only
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // ---------------------------------------------------------------------------
    // CMS AI translation (server only, optional). When unset, the admin CMS
    // shows AI translation as "not configured" and manual translation remains.
    // ---------------------------------------------------------------------------
    CMS_TRANSLATION_PROVIDER: z.enum(["none", "openai"]).optional(),
    CMS_TRANSLATION_API_KEY: z.string().min(1).optional(),
    CMS_TRANSLATION_API_URL: z.string().url().optional(),
    CMS_TRANSLATION_MODEL: z.string().min(1).optional(),

    // ---------------------------------------------------------------------------
    // Field-report intake (server only, optional). When TWILIO_AUTH_TOKEN is
    // unset the webhook refuses every delivery with 503 (fail closed) unless
    // TWILIO_ALLOW_UNSIGNED_WEBHOOK=true in a non-production environment.
    // ---------------------------------------------------------------------------
    TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
    TWILIO_WEBHOOK_URL: z.string().url().optional(),
    TWILIO_ALLOW_UNSIGNED_WEBHOOK: z.enum(["true", "false"]).optional(),

    // ---------------------------------------------------------------------------
    // Public abuse protection (server only, optional).
    // ---------------------------------------------------------------------------
    // Number of trusted proxy hops in front of the app. `x-forwarded-for` is
    // honored ONLY when this is > 0 (the Nth entry from the right). Keep 0 if
    // in doubt: without trusted proxies the header is attacker-controlled.
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).optional(),
    // Opt-in: honor `x-real-ip` from the edge when there are no trusted hops.
    TRUST_PROXY_REAL_IP: z.enum(['true', 'false']).optional(),
    // Cloudflare Turnstile / hCaptcha secret for public form + donation intake.
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
    HCAPTCHA_SECRET_KEY: z.string().min(1).optional(),
    // 'required' rejects public submissions that arrive without a CAPTCHA token.
    PUBLIC_CAPTCHA_MODE: z.enum(['off', 'optional', 'required']).optional(),
    // 'memory_only' disables the distributed Postgres limiter (local dev only).
    RATE_LIMIT_MODE: z.enum(['distributed', 'memory_only']).optional(),
    // Shared secret expected from the CDN/WAF in `x-awe-edge-secret`. Enables
    // the edge gate: requests that bypassed the edge are refused.
    EDGE_SHARED_SECRET: z.string().min(1).optional(),
    // Where abuse alerts are POSTed (Slack/Teams/Ops webhook). Optional.
    ABUSE_ALERT_WEBHOOK_URL: z.string().url().optional(),
    // Risk score (0–100) at which an abuse alert is sent. Default 50.
    ABUSE_ALERT_MIN_SCORE: z.coerce.number().min(0).max(100).optional(),
    // Salt for hashing throttle identities before they are stored/shipped.
    ABUSE_HASH_SALT: z.string().min(1).optional(),

    // ---------------------------------------------------------------------------
    // Field PII encryption (server only). REQUIRED in production: beneficiary
    // names and phone numbers are AES-GCM ciphertext without it, and the
    // registration flow refuses to store PII. Generate: openssl rand -hex 32
    // ---------------------------------------------------------------------------
    ENCRYPTION_KEY: z.string().min(32).optional(),

    // ---------------------------------------------------------------------------
    // AI drafting (server only, optional). Disabled unless explicitly enabled:
    // the copilot must never present template text as an AI finding.
    // ---------------------------------------------------------------------------
    AI_COPILOT_ENABLED: z.enum(["true", "false"]).optional(),

    // ---------------------------------------------------------------------------
    // Payment processing (server only, optional). When unset, donations are
    // recorded as explicit "pledges" and the UI communicates this honestly.
    // When set, donations are completed through Stripe Checkout.
    // ---------------------------------------------------------------------------
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email().optional(),
    ADMIN_EMAIL: z.string().email().optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RECEIPT_HMAC_SECRET: z.string().min(32).optional(),
});

// 2. Explicitly map variables to ensure Next.js inlines them
// We use a runtimeEnv object to force the compiler to see the keys
const runtimeEnv = {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    CMS_TRANSLATION_PROVIDER: process.env.CMS_TRANSLATION_PROVIDER,
    CMS_TRANSLATION_API_KEY: process.env.CMS_TRANSLATION_API_KEY,
    CMS_TRANSLATION_API_URL: process.env.CMS_TRANSLATION_API_URL,
    CMS_TRANSLATION_MODEL: process.env.CMS_TRANSLATION_MODEL,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_WEBHOOK_URL: process.env.TWILIO_WEBHOOK_URL,
    TWILIO_ALLOW_UNSIGNED_WEBHOOK: process.env.TWILIO_ALLOW_UNSIGNED_WEBHOOK,
    TRUSTED_PROXY_HOPS: process.env.TRUSTED_PROXY_HOPS,
    TRUST_PROXY_REAL_IP: process.env.TRUST_PROXY_REAL_IP,
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    HCAPTCHA_SECRET_KEY: process.env.HCAPTCHA_SECRET_KEY,
    PUBLIC_CAPTCHA_MODE: process.env.PUBLIC_CAPTCHA_MODE,
    RATE_LIMIT_MODE: process.env.RATE_LIMIT_MODE,
    EDGE_SHARED_SECRET: process.env.EDGE_SHARED_SECRET,
    ABUSE_ALERT_WEBHOOK_URL: process.env.ABUSE_ALERT_WEBHOOK_URL,
    ABUSE_ALERT_MIN_SCORE: process.env.ABUSE_ALERT_MIN_SCORE,
    ABUSE_HASH_SALT: process.env.ABUSE_HASH_SALT,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    AI_COPILOT_ENABLED: process.env.AI_COPILOT_ENABLED,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    EMAIL_FROM: process.env.EMAIL_FROM,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RECEIPT_HMAC_SECRET: process.env.RECEIPT_HMAC_SECRET,
};

// 3. Validate
const parsed = envSchema.safeParse(runtimeEnv);

if (!parsed.success) {
    console.error(
        "❌ Invalid environment variables:",
        JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)
    );
    // Only throw in the browser if it's a critical public variable missing
    // On server, always throw to prevent bad boots
    if (typeof window === 'undefined' || !parsed.success) {
        throw new Error("Invalid environment variables");
    }
}

export const ENV = parsed.data;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/** Whether Stripe Checkout is configured for real payment processing. */
export const isStripeConfigured = !!(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_')
);

/** Whether server-side AI translation is configured. */
export const isAiTranslationConfigured = !!(
    process.env.CMS_TRANSLATION_PROVIDER &&
    process.env.CMS_TRANSLATION_PROVIDER !== 'none' &&
    (process.env.CMS_TRANSLATION_API_KEY || process.env.OPENAI_API_KEY)
);

/**
 * Whether inbound field-report intake can verify Twilio signatures. Without a
 * token the webhook fails closed (503) rather than trusting unsigned traffic.
 */
export const isFieldReportIntakeConfigured = !!process.env.TWILIO_AUTH_TOKEN;

/** Whether bot protection (Turnstile/hCaptcha) can be verified server-side. */
export const isBotProtectionConfigured = !!(
    process.env.TURNSTILE_SECRET_KEY || process.env.HCAPTCHA_SECRET_KEY
);

/**
 * Whether the CDN/WAF edge gate is active. When set, a request that did not
 * pass through the edge (no `x-awe-edge-secret`) is refused before any
 * database work.
 */
export const isEdgeGateConfigured = !!process.env.EDGE_SHARED_SECRET;

/** Whether abuse alerts are delivered to an operations webhook. */
export const isAbuseAlertingConfigured = !!process.env.ABUSE_ALERT_WEBHOOK_URL;

/**
 * Whether AI drafting is enabled. Defaults to OFF: the copilot must never pass
 * deterministic template text off as an AI finding, so it has to be switched on
 * deliberately per deployment.
 */
export const isAiCopilotEnabled = process.env.AI_COPILOT_ENABLED === 'true';