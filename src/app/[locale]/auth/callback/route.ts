import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { routing } from '@/lib/navigation';
import { ADMIN_PANEL_ROLES, hasRole } from '@/lib/auth/permissions';

/**
 * Auth callback — exchanges the OAuth / email-confirmation / magic-link
 * `code` for a session, then routes membership-aware:
 *   explicit `next` (relative only) > admin > dashboard > setup (no org yet).
 *
 * Without this route every email confirmation and OAuth sign-in lands on a
 * 404, because signUp/signIn helpers redirect here.
 */
function sanitizeNext(value: string | null): string | null {
    if (!value) return null;
    if (!value.startsWith('/')) return null;
    if (value.startsWith('//')) return null;
    if (value.includes('\\')) return null;
    try {
        const parsed = new URL(value, 'http://localhost');
        const normalized = parsed.pathname + parsed.search + parsed.hash;
        return normalized.startsWith('/') ? normalized : null;
    } catch {
        return null;
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ locale: string }> },
) {
    const { locale: rawLocale } = await params;
    const locale = routing.locales.includes(rawLocale as (typeof routing.locales)[number])
        ? rawLocale
        : routing.defaultLocale;

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const next = sanitizeNext(url.searchParams.get('next'));
    const loginUrl = new URL(`/${locale}/auth/login`, req.url);

    if (!code) {
        loginUrl.searchParams.set('error', 'missing_code');
        return NextResponse.redirect(loginUrl);
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
        loginUrl.searchParams.set('error', 'exchange_failed');
        return NextResponse.redirect(loginUrl);
    }

    if (next) return NextResponse.redirect(new URL(next, req.url));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(loginUrl);

    const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    const role = membership?.role as string | undefined;
    if (hasRole(role, ADMIN_PANEL_ROLES)) {
        return NextResponse.redirect(new URL(`/${locale}/admin`, req.url));
    }
    if (role) {
        return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
    }
    return NextResponse.redirect(new URL(`/${locale}/auth/setup`, req.url));
}
