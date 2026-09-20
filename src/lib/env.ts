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