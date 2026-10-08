import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness/readiness probe (P0 ops).
 * Returns 200 when the app can reach its critical dependency (Supabase),
 * 503 otherwise. Never leaks internal error details.
 */
export async function GET() {
    const checks: Record<string, { ok: boolean; latencyMs?: number }> = {};

    // Supabase reachability — a cheap authenticated round-trip.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
        const start = Date.now();
        try {
            const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
                headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '' },
                signal: AbortSignal.timeout(3000),
                cache: 'no-store',
            });
            checks.supabase = { ok: res.ok, latencyMs: Date.now() - start };
        } catch {
            checks.supabase = { ok: false, latencyMs: Date.now() - start };
        }
    } else {
        checks.supabase = { ok: false };
    }

    const healthy = Object.values(checks).every((c) => c.ok);
    return NextResponse.json(
        {
            status: healthy ? 'ok' : 'degraded',
            checks,
            timestamp: new Date().toISOString(),
        },
        { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
}
