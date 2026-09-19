'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * Verify an MFA code (TOTP or recovery code) for the current session.
 * Supabase accepts recovery codes through the same verify endpoint.
 * Returns an error message on failure, or null on success.
 */
export async function verifyMfaCode(code: string): Promise<{ error: string | null }> {
    const supabase = createSupabaseBrowserClient();

    // 1. List enrolled factors for the signed-in user
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) return { error: factorsError.message };

    const totpFactor = factorsData?.totp?.[0];
    if (!totpFactor) {
        return { error: 'No MFA factor enrolled' };
    }

    // 2. Create a challenge
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
    });
    if (challengeError) return { error: challengeError.message };

    // 3. Verify the code (TOTP or recovery code)
    const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
    });
    if (verifyError) return { error: verifyError.message };

    return { error: null };
}
