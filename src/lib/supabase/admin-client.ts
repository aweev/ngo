import { createServerClient } from '@supabase/ssr';

/**
 * SINGLE CHOKE POINT for the Supabase service-role client (Phase 0, item 0.2.4).
 *
 * This key bypasses Row Level Security. All privileged callers (webhooks,
 * receipts, admin storage uploads, user administration) must import from
 * HERE — never construct their own service-role client. `server.ts`
 * re-exports this function for backward compatibility; new code imports
 * `@/lib/supabase/admin-client` directly so the blast radius stays greppable.
 */
export function createSupabaseAdminClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            cookies: {
                getAll() {
                    // Admin client is server-only and session-less
                    return [];
                },
                setAll() {
                    // No session persistence for the admin client
                },
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}
