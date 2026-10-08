/**
 * Consent evidence writer (audit Wave 1 privacy operating model).
 *
 * Plain server module (NOT 'use server') so it is NOT a browser-callable
 * Server Action: consent evidence must come from trusted server flows
 * (newsletter intake, form submissions, donations, admin tools) which pass
 * their own RLS-scoped client after authenticating the request.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const consentInputSchema = z.object({
    subjectType: z.enum(['donor', 'volunteer', 'worker', 'newsletter_subscriber', 'form_submitter', 'beneficiary', 'other']),
    subjectId: z.string().uuid().optional().nullable(),
    subjectEmail: z.string().trim().email().max(200).optional().nullable(),
    consentType: z.string().trim().min(2).max(80),
    policyVersion: z.string().trim().min(1).max(40),
    source: z.string().trim().max(120).optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
});

export type ConsentInput = z.infer<typeof consentInputSchema>;

/**
 * Inserts one granted-consent record. Returns the new id, or null on error
 * (callers decide whether a consent failure is fatal — intake flows log and
 * continue so a privacy-table hiccup never blocks a public signup).
 */
export async function recordConsent(
    supabase: SupabaseClient,
    organizationId: string,
    input: ConsentInput,
): Promise<string | null> {
    const { data, error } = await supabase
        .from('consent_records')
        .insert({
            organization_id: organizationId,
            subject_type: input.subjectType,
            subject_id: input.subjectId ?? null,
            subject_email: input.subjectEmail?.toLowerCase() ?? null,
            consent_type: input.consentType,
            policy_version: input.policyVersion,
            status: 'granted',
            granted_at: new Date().toISOString(),
            expires_at: input.expiresAt ?? null,
            source: input.source ?? null,
        })
        .select('id')
        .single();
    if (error) {
        console.error('[privacy] Failed to record consent:', error.message);
        return null;
    }
    return (data as { id: string }).id;
}
