import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { renderReceiptPdf, verifyReceiptToken, type ReceiptData } from '@/lib/receipts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const token = new URL(request.url).searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 403 });
    const email = verifyReceiptToken(id, token);
    if (!email) return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 403 });

    const supabase = createSupabaseAdminClient();
    const { data: donation } = await supabase
        .from('donations')
        .select('id,amount,currency,type,status,donor_name,email,donated_at,payment_ref,organization_id')
        .eq('id', id)
        .maybeSingle();
    if (!donation || donation.status !== 'completed' || donation.type !== 'one_time') {
        return NextResponse.json({ error: 'Tax receipt not available.' }, { status: 404 });
    }
    if ((donation.email ?? '').toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 403 });
    }

    let organizationName: string | null = null;
    if (donation.organization_id) {
        const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', donation.organization_id)
            .maybeSingle();
        organizationName = (org?.name as string | null) ?? null;
    }

    const payload: ReceiptData = {
        id: donation.id as string,
        amount: Number(donation.amount),
        currency: (donation.currency as string) ?? 'EUR',
        type: (donation.type as string) ?? 'one_time',
        status: donation.status as string,
        donorName: (donation.donor_name as string | null) ?? null,
        email: (donation.email as string | null) ?? null,
        donatedAt: (donation.donated_at as string | null) ?? null,
        paymentRef: (donation.payment_ref as string | null) ?? null,
        organizationName,
    };
    const pdf = await renderReceiptPdf(payload, 'tax');
    return new NextResponse(Buffer.from(pdf), {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="tax-receipt-${id.slice(0, 8)}.pdf"`,
            'Cache-Control': 'private, no-store',
            'X-Robots-Tag': 'noindex, nofollow',
        },
    });
}
