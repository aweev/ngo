import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { PUBLIC_CONTENT_TAG, PUBLIC_REVALIDATE_SECONDS } from '@/lib/cache-tags';

/**
 * Creates a Supabase client for Server Components, Server Actions, and Route Handlers.
 * This client respects Row Level Security (RLS) based on the authenticated user.
 */
export async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `set` method was called from a Server Component.
                        // This can happen if you're trying to set a cookie in a
                        // Server Component where cookies are read-only.
                        // This is expected and can be safely ignored.
                    }
                },
            },
        }
    );
}

/**
 * Creates a Supabase client for use in Route Handlers with explicit session management.
 * Use this when you need to handle auth state changes in API routes.
 */
export async function createSupabaseRouteHandlerClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                },
            },
        }
    );
}

/**
 * Creates a Supabase Admin client with service role key.
 * WARNING: This bypasses RLS. Only use for admin operations that require elevated privileges.
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

/**
 * Cookieless anon-key client for PUBLIC reads on the public website.
 *
 * Never touches request cookies, so pages calling it remain eligible for
 * static prerendering / ISR caching (reading cookies would force dynamic
 * rendering for every visitor). Only read from anon-safe `public_*` views
 * and SECURITY DEFINER RPCs — Row Level Security still applies to the
 * anon role, so no protected data can be exposed through this client.
 *
 * Requests are routed through Next.js' Data Cache (fetch `next.revalidate`
 * + `next.tags`), so a public page — even one that must render dynamically
 * because it reads `searchParams` — reuses one cached DB response per
 * revalidation window instead of hitting Supabase on every request.
 * Admin publish flows purge the cache with
 * `revalidateTag(PUBLIC_CONTENT_TAG)` (see `@/lib/cache`).
 */
export function createSupabasePublicClient(
    options: { revalidate?: number | false; tags?: string[] } = {}
) {
    const { revalidate = PUBLIC_REVALIDATE_SECONDS, tags = [PUBLIC_CONTENT_TAG] } = options;
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
            global: {
                fetch: (input: RequestInfo | URL, init?: RequestInit) => {
                    // Outside a Next.js request context (scripts, tests) the
                    // `next` field is simply ignored by the platform fetch.
                    const nextOptions =
                        revalidate === false
                            ? { revalidate: 0 as const }
                            : { revalidate, tags };
                    return fetch(input, { ...init, next: nextOptions } as RequestInit);
                },
            },
        }
    );
}
