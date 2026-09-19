import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for Client Components.
 * This client respects Row Level Security (RLS) based on the authenticated user.
 */
export function createSupabaseBrowserClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}
