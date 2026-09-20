'use server';

import { z } from 'zod';
import { ENV } from '@/lib/env';

/**
 * Email delivery — Resend-first (Supabase-only auth stack, no nodemailer).
 * RESEND_API_KEY enables real delivery. EMAIL_FROM is the verified sender.
 * When unconfigured, senders return {success:false} — nothing fake-sent.
 */

const emailSchema = z.object({
    to: z.string().email().max(200),
    subject: z.string().trim().min(1).max(200),
    html: z.string().trim().min(1).max(100_000),
    text: z.string().max(100_000).optional(),
});

export type EmailResult = { success: boolean; error: string | null; messageId?: string };

/** HTML-escape untrusted interpolation for email bodies. */
export function escapeHtml(value: string | number | null | undefined): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export async function sendEmail(input: unknown): Promise<EmailResult> {
    const parsed = emailSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: 'Invalid email payload.' };
    const apiKey = ENV.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
    if (!apiKey) return { success: false, error: 'Email service not configured.' };
    try {
        const { Resend } = await import('resend');
        const resend = new Resend(apiKey);
        const { data, error } = await resend.emails.send({
            from: ENV.EMAIL_FROM ?? 'noreply@awe-ev.org',
            to: parsed.data.to,
            subject: parsed.data.subject,
            html: parsed.data.html,
            text: parsed.data.text,
        });
        if (error) {
            console.error('[sendEmail] Resend error:', error.message);
            return { success: false, error: 'Failed to send email.' };
        }
        return { success: true, error: null, messageId: data?.id };
    } catch (err) {
        console.error('[sendEmail]', err instanceof Error ? err.message : err);
        return { success: false, error: 'Failed to send email.' };
    }
}

export async function sendDonationReceipt(params: {
    to: string;
    donorName: string;
    amount: number;
    currency: string;
    donationId: string;
    receiptUrl?: string;
}): Promise<{ success: boolean; error: string | null }> {
    const amountLabel = `${Number(params.amount).toFixed(2)} ${params.currency}`;
    const receiptLink = params.receiptUrl
        ? `<a href="${escapeHtml(params.receiptUrl)}">Download receipt (PDF)</a>`
        : 'Your receipt is being prepared.';
    const html = `
        <h1>Thank you for your donation, ${escapeHtml(params.donorName)}!</h1>
        <p>We are grateful for your support.</p>
        <table>
            <tr><td>Donation ID:</td><td>${escapeHtml(params.donationId)}</td></tr>
            <tr><td>Amount:</td><td>${escapeHtml(amountLabel)}</td></tr>
            <tr><td>Receipt:</td><td>${receiptLink}</td></tr>
        </table>
        <p>If you have any questions, please contact us.</p>
    `;
    return sendEmail({
        to: params.to,
        subject: `Donation Receipt — ${params.donationId}`,
        html,
        text: `Thank you for your donation of ${amountLabel}. Donation ID: ${params.donationId}`,
    });
}

export async function sendTaxReceipt(params: {
    to: string;
    donorName: string;
    amount: number;
    currency: string;
    donationId: string;
    taxReceiptUrl?: string;
}): Promise<{ success: boolean; error: string | null }> {
    const amountLabel = `${Number(params.amount).toFixed(2)} ${params.currency}`;
    const receiptLink = params.taxReceiptUrl
        ? `<a href="${escapeHtml(params.taxReceiptUrl)}">Download Zuwendungsbestätigung (PDF)</a>`
        : 'Your tax receipt is being prepared.';
    const html = `
        <h1>Tax Receipt — ${escapeHtml(params.donorName)}</h1>
        <p>This receipt confirms your tax-deductible donation (Zuwendungsbestätigung).</p>
        <table>
            <tr><td>Donation ID:</td><td>${escapeHtml(params.donationId)}</td></tr>
            <tr><td>Amount:</td><td>${escapeHtml(amountLabel)}</td></tr>
            <tr><td>Tax Receipt:</td><td>${receiptLink}</td></tr>
        </table>
    `;
    return sendEmail({
        to: params.to,
        subject: `Tax Receipt — ${params.donationId}`,
        html,
        text: `Tax Receipt for donation of ${amountLabel}. Donation ID: ${params.donationId}`,
    });
}

export async function sendNewsletterDoubleOptIn(params: {
    to: string;
    email: string;
    token: string;
}): Promise<{ success: boolean; error: string | null }> {
    const appUrl = (ENV.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const confirmUrl = `${appUrl}/public/subscribe/confirm?token=${encodeURIComponent(params.token)}`;
    const html = `
        <h1>Confirm your newsletter subscription</h1>
        <p>Click the link below to confirm your subscription:</p>
        <p><a href="${escapeHtml(confirmUrl)}">${escapeHtml(confirmUrl)}</a></p>
        <p>If you did not request this, you can ignore this email.</p>
    `;
    return sendEmail({
        to: params.to,
        subject: 'Confirm your newsletter subscription',
        html,
        text: `Confirm your subscription: ${confirmUrl}`,
    });
}

export async function sendReviewRequest(params: {
    pageId: string;
    locale: string;
    userId: string;
}): Promise<{ success: boolean; error: string | null }> {
    const adminEmail = ENV.ADMIN_EMAIL ?? process.env.ADMIN_EMAIL;
    if (!adminEmail) return { success: false, error: 'Review notification not configured.' };
    const html = `
        <h1>Content Review Requested</h1>
        <p>Content page <strong>${escapeHtml(params.pageId)}</strong> (${escapeHtml(params.locale)}) requires your review.</p>
        <p>Please log in to the admin panel to review the content.</p>
    `;
    return sendEmail({
        to: adminEmail,
        subject: `Review requested: ${params.pageId} (${params.locale})`,
        html,
        text: `Review requested for ${params.pageId} (${params.locale}).`,
    });
}

export async function sendWorkflowNotification(params: {
    to: string;
    subject: string;
    message: string;
}): Promise<{ success: boolean; error: string | null }> {
    return sendEmail({
        to: params.to,
        subject: params.subject,
        html: `<h1>${escapeHtml(params.subject)}</h1><p>${escapeHtml(params.message)}</p>`,
        text: params.message,
    });
}

export async function sendNewsletterUnsubscribe(params: {
    to: string;
    email: string;
}): Promise<{ success: boolean; error: string | null }> {
    const html = `
        <h1>Unsubscribe from newsletter</h1>
        <p>You are receiving this because you subscribed to our newsletter.</p>
        <p>If you wish to unsubscribe, your subscription has been removed.</p>
        <p>Thank you for your support.</p>
    `;
    return sendEmail({
        to: params.to,
        subject: 'Newsletter unsubscribe confirmation',
        html,
        text: 'You have been unsubscribed from our newsletter.',
    });
}
