import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Browser-side auth helpers (client components only).
 * Server-side session helpers live in ./supabase-auth.server.ts
 */

/**
 * Sign in with email and password
 */
export async function signInWithPassword(email: string, password: string) {
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message, data: null };
    }

    return { data, error: null };
}

/**
 * Sign up with email and password
 */
export async function signUpWithPassword(
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
    emailRedirectTo?: string,
) {
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: metadata,
            emailRedirectTo,
        },
    });

    if (error) {
        return { error: error.message, data: null };
    }

    return { data, error: null };
}

/**
 * Sign out the current user
 */
export async function signOut() {
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
        return { error: error.message };
    }

    return { error: null };
}

/**
 * Reset password request
 */
export async function resetPasswordRequest(email: string) {
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
        return { error: error.message };
    }

    return { error: null };
}

/**
 * Update password (after reset)
 */
export async function updatePassword(newPassword: string) {
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) {
        return { error: error.message };
    }

    return { error: null };
}

/**
 * Sign in with OAuth provider (Google, GitHub, GitLab, Facebook)
 */
export async function signInWithOAuth(provider: 'google' | 'github' | 'gitlab' | 'facebook') {
    const supabase = createSupabaseBrowserClient();

    // Keep the locale prefix so the callback lands directly on
    // /[locale]/auth/callback instead of relying on middleware redirects
    // (which risk dropping the one-time `code` query param).
    const locale = window.location.pathname.split('/')[1] || 'en';
    const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${window.location.origin}/${locale}/auth/callback`,
        },
    });

    return { error: error?.message ?? null };
}

/**
 * Resend a signup/verification email
 */
export async function resendVerificationEmail(email: string, redirectTo?: string) {
    const supabase = createSupabaseBrowserClient();

    const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });

    return { error: error?.message ?? null };
}

/**
 * Send a magic link (passwordless) sign-in email
 */
export async function signInWithOtp(email: string, redirectTo?: string) {
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });

    return { data, error: error?.message ?? null };
}

/**
 * List the current user's MFA factors (TOTP)
 */
export async function listMFAFactors() {
    const supabase = createSupabaseBrowserClient();

    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
        return { factors: [], error: error.message };
    }

    return { factors: data.totp, error: null };
}

/**
 * Challenge and verify an MFA factor with a TOTP or recovery code
 */
export async function challengeAndVerifyMFA(factorId: string, code: string) {
    const supabase = createSupabaseBrowserClient();

    try {
        const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
        return { data, error: error?.message ?? null };
    } catch (e) {
        return { data: null, error: e instanceof Error ? e.message : 'MFA verification failed' };
    }
}