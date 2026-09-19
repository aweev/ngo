import { NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';

interface CallbackContext {
    params: Promise<{ locale: string }>;
}

export async function GET(request: Request, { params }: CallbackContext) {
    const url = new URL(request.url);
    const { locale } = await params;
    const code = url.searchParams.get('code');
    const destination = new URL(`/${locale}/auth/verify-email`, url.origin);

    if (!code) {
        destination.searchParams.set('verification_error', 'true');
        return NextResponse.redirect(destination);
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    destination.searchParams.set(error ? 'verification_error' : 'verified', 'true');
    return NextResponse.redirect(destination);
}