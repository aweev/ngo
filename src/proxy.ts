import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './lib/navigation';
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware';
import { ADMIN_PANEL_ROLES, hasRole } from './lib/auth/permissions';

const intlMiddleware = createIntlMiddleware(routing);

/** Relative `callbackUrl` values are safe; absolute/external ones are dropped. */
function sanitizeCallbackUrl(value: string | null): string | null {
    if (!value) return null;
    if (!value.startsWith('/')) return null;
    if (value.startsWith('//')) return null;
    if (value.includes('\\')) return null;
    try {
        const parsed = new URL(value, 'http://localhost');
        const normalized = parsed.pathname + parsed.search + parsed.hash;
        // Drop locale-less or dangerous paths — callers re-prefix the locale.
        if (!normalized.startsWith('/')) return null;
        return normalized;
    } catch {
        return null;
    }
}

export async function proxy(req: NextRequest) {
    const { supabase } = await createSupabaseMiddlewareClient(req);

    // Use getUser() (auth server validation), not getSession() (untrusted cookie read).
    const { data: { user } } = await supabase.auth.getUser();

    const url = new URL(req.url);
    const pathname = url.pathname;
    
    // Extract locale from pathname
    const locale = pathname.split('/')[1] || routing.defaultLocale;
    const pathnameWithoutLocale = pathname.replace(`/${locale}`, '') || '/';

    // 1. Define Protected Zones (field app included: beneficiary PII lives there)
    const isProtected = pathnameWithoutLocale.startsWith('/admin') || pathnameWithoutLocale.startsWith('/dashboard') || pathnameWithoutLocale.startsWith('/field');
    const isAuthPage = pathnameWithoutLocale.startsWith('/auth/login') || pathnameWithoutLocale.startsWith('/auth/register');

    // 2. Auth Guard (Redirect to Login)
    if (isProtected && !user) {
        const loginUrl = new URL(`/${locale}/auth/login`, req.url);
        // callbackUrl is trusted because sanitizeCallbackUrl() only keeps
        // relative same-origin paths; login-form re-validates before pushing.
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 2b. Step-up: users with a verified MFA factor must finish AAL2 before
    // entering protected zones. AAL1 sessions (password only) are bounced
    // to /auth/mfa even if they know a deep link; MFA-less users pass.
    if (isProtected && user) {
        const isMfaChallengePage = pathnameWithoutLocale.startsWith('/auth/mfa');
        if (!isMfaChallengePage) {
            try {
                const { data: factorsData } = await supabase.auth.mfa.listFactors();
                const enrolled = (factorsData?.totp ?? []).some((f) => f.status === 'verified');
                if (enrolled) {
                    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
                    const levels = [aalData?.currentLevel, aalData?.nextLevel];
                    if (!levels.includes('aal2')) {
                        const mfaUrl = new URL(`/${locale}/auth/mfa`, req.url);
                        mfaUrl.searchParams.set('callbackUrl', sanitizeCallbackUrl(pathname) ?? `/${locale}/dashboard`);
                        return NextResponse.redirect(mfaUrl);
                    }
                }
            } catch {
                // Phase 0: fail CLOSED to the MFA challenge. An MFA-API error
                // must never silently downgrade an enrolled user to AAL1 —
                // layouts + RLS remain the second line, not the excuse.
                // Users are not locked out: completing the challenge grants entry.
                const mfaUrl = new URL(`/${locale}/auth/mfa`, req.url);
                mfaUrl.searchParams.set('callbackUrl', sanitizeCallbackUrl(pathname) ?? `/${locale}/dashboard`);
                return NextResponse.redirect(mfaUrl);
            }
        }
    }

    // 2c. Org-less users (signed in, no membership yet) cannot use protected
    // zones — send them to the setup wizard, which either bootstraps a fresh
    // workspace (first user) or explains the invite flow. Invite/claim/setup
    // pages live outside protected zones, so claiming still works.
    if (isProtected && user) {
        const { data: membership } = await supabase
            .from('organization_members')
            .select('user_id')
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();
        if (!membership) {
            return NextResponse.redirect(new URL(`/${locale}/auth/setup`, req.url));
        }
    }

    // 3. Redirect logged-in users away from Login page
    if (isAuthPage && user) {
        // Get user's role from organization_members
        const { data: membership } = await supabase
            .from('organization_members')
            .select('role')
            .eq('user_id', user.id)
            .single();

        const role = membership?.role;
        const target = hasRole(role, ADMIN_PANEL_ROLES) ? '/admin' : '/dashboard';
        return NextResponse.redirect(new URL(`/${locale}${target}`, req.url));
    }

    // 4. Run i18n middleware
    return intlMiddleware(req);
}

export const config = {
    // Skip next internals, api, static files, and PWA service workers
    matcher: ['/((?!api|_next|_vercel|sw.js|workbox|.*\\..*).*)']
};
