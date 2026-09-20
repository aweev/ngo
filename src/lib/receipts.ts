import { createHmac, timingSafeEqual } from 'node:crypto';
import { ENV } from '@/lib/env';

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string | null {
    return ENV.RECEIPT_HMAC_SECRET ?? process.env.RECEIPT_HMAC_SECRET ?? null;
}

/** Sign a receipt token: `<donationId>.<email>.<expiry>.<hmac>`, URL-safe base64 email. */
export function signReceiptToken(donationId: string, email: string | null): string | null {
    const s = secret();
    if (!s) return null;
    const exp = Date.now() + TOKEN_TTL_MS;
    const emailB64 = Buffer.from((email ?? '').toLowerCase()).toString('base64url');
    const payload = `${donationId}.${emailB64}.${exp}`;
    const mac = createHmac('sha256', s).update(payload).digest('hex');
    return `${payload}.${mac}`;
}

/** Verify token for a donation id. Returns email on success, null otherwise. */
export function verifyReceiptToken(donationId: string, token: string): string | null {
    try {
        const s = secret();
        if (!s || !token) return null;
        const parts = token.split('.');
        if (parts.length !== 4) return null;
        const [id, emailB64, expRaw, mac] = parts;
        if (id !== donationId) return null;
        const exp = Number(expRaw);
        if (!Number.isFinite(exp) || Date.now() > exp) return null;
        const payload = `${id}.${emailB64}.${expRaw}`;
        const expected = createHmac('sha256', s).update(payload).digest('hex');
        const a = Buffer.from(mac, 'utf8');
        const b = Buffer.from(expected, 'utf8');
        if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
        return Buffer.from(emailB64, 'base64url').toString('utf8');
    } catch {
        return null;
    }
}

export function receiptUrlFor(donationId: string, email: string | null, kind: 'receipt' | 'tax'): string | null {
    const token = signReceiptToken(donationId, email);
    if (!token) return null;
    const base = (ENV.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const path = kind === 'tax' ? 'tax-receipts' : 'receipts';
    return `${base}/api/${path}/${donationId}?token=${encodeURIComponent(token)}`;
}

export type ReceiptData = {
    id: string;
    amount: number;
    currency: string;
    type: string;
    status: string;
    donorName: string | null;
    email: string | null;
    donatedAt: string | null;
    paymentRef: string | null;
    organizationName: string | null;
};

/**
 * Render a one-page donation receipt / Zuwendungsbestätigung PDF with pdf-lib
 * (no native deps, works on Alpine/Docker). Text-only layout day-1.
 */
export async function renderReceiptPdf(data: ReceiptData, kind: 'receipt' | 'tax'): Promise<Uint8Array> {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const doc = await PDFDocument.create();
    const page = doc.addPage([595.28, 841.89]); // A4
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const { height } = page.getSize();
    let y = height - 72;
    const left = 56;
    const ink = rgb(0.13, 0.13, 0.15);
    const muted = rgb(0.4, 0.4, 0.44);

    const line = (text: string, opts?: { bold?: boolean; size?: number; gap?: number; color?: typeof ink }) => {
        page.drawText(text.slice(0, 110), {
            x: left,
            y,
            size: opts?.size ?? 11,
            font: opts?.bold ? bold : font,
            color: opts?.color ?? ink,
        });
        y -= opts?.gap ?? 20;
    };

    line(data.organizationName ?? 'AWE e.V.', { bold: true, size: 18, gap: 28 });
    line(kind === 'tax' ? 'Zuwendungsbestätigung' : 'Donation Receipt', { bold: true, size: 14, gap: 10 });
    line(
        kind === 'tax'
            ? 'Bestätigung über Geldzuwendungen im Sinne des § 10b EStG'
            : 'Thank you for your support.',
        { size: 10, color: muted, gap: 26 },
    );
    line(`Donor: ${data.donorName ?? '—'}`);
    line(`Email: ${data.email ?? '—'}`);
    line(`Amount: ${Number(data.amount).toFixed(2)} ${data.currency}`);
    line(`Type: ${data.type === 'recurring' ? 'Recurring (monthly)' : 'One-time'}`);
    line(`Date: ${data.donorName ? (data.donatedAt ? new Date(data.donatedAt).toISOString().slice(0, 10) : '—') : '—'}`);
    line(`Donation ID: ${data.id}`);
    if (data.paymentRef) line(`Payment ref: ${data.paymentRef}`);
    y -= 12;
    line('This document was generated automatically and is valid without signature.', {
        size: 9,
        color: muted,
        gap: 16,
    });
    if (kind === 'tax') {
        line('Nur für Zuwendungen zur Vorlage beim Finanzamt. Es wird bestätigt,', { size: 9, color: muted, gap: 14 });
        line('dass die Zuwendung nur für satzungsgemäße Zwecke verwendet wird.', { size: 9, color: muted, gap: 14 });
    }
    return doc.save();
}
