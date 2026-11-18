import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for Client Components.
 * This client respects Row Level Security (RLS) based on the authenticated user.
 */
export function createSupabaseBrowserClient() {
    // Provide placeholder values if env vars are not set (e.g., during build or misconfigured deploy)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key';

    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
