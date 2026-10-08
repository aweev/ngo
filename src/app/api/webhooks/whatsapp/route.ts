import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { digestPayload, normalizePhoneNumber, verifyTwilioSignature } from '@/lib/whatsapp-signature';
import { FIELD_REPORT_GUIDANCE, parseFieldReport } from '@/lib/whatsapp-bridge';

/**
 * Inbound Twilio / WhatsApp field-report webhook.
 * Route: POST /api/webhooks/whatsapp
 *
 * This endpoint is internet-facing and unauthenticated by nature, so every
 * layer of it fails closed (audit Wave 0, item 2):
 *
 *   1. The Twilio signature is verified against the production callback URL
 *      over the *raw* form parameters. No auth token -> 503, never "trusted".
 *   2. The sender must be an approved field reporter (`field_report_senders`
 *      with status = 'active'); unknown numbers get guidance, not a write.
 *   3. The message must carry PROJECT, METRIC, VALUE and LOCATION. Anything
 *      unclear is quarantined for human review instead of being guessed at.
 *   4. The message id is the idempotency key: a replayed or retried delivery
 *      can never create a second report.
 *   5. Nothing here touches `impact_measurements`. A report becomes a metric
 *      only through `promote_field_report()` (impact.manage, audited).
 *   6. Every delivery is recorded in `whatsapp_webhook_events` (SHA-256 digest,
 *      never a raw payload for rejected traffic) and accepted/quarantined
 *      reports additionally write an `audit_logs` entry.
 */

export const runtime = 'nodejs';

type Outcome =
    | 'accepted'
    | 'quarantined'
    | 'duplicate'
    | 'rejected_signature'
    | 'unknown_sender'
    | 'invalid_payload'
    | 'not_configured'
    | 'error';

/** Hard cap on inbound body size (SMS is 1600 chars; WhatsApp is not much more). */
const MAX_BODY_LENGTH = 4000;

const TWIML_HEADERS = { 'Content-Type': 'text/xml; charset=utf-8' };

function twiml(message: string, status = 200): Response {
    const escaped = message
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n    <Message>${escaped}</Message>\n</Response>`,
        { status, headers: TWIML_HEADERS },
    );
}

function json(body: Record<string, unknown>, status: number) {
    return NextResponse.json(body, { status });
}

/**
 * URLs a Twilio signature may legitimately have been computed over, most
 * trusted first: the configured production callback URL, then this deployment's
 * app URL, then (only in non-production) whatever URL reached the server.
 */
function candidateUrls(requestUrl: string): string[] {
    const urls: string[] = [];
    const configured = process.env.TWILIO_WEBHOOK_URL?.trim();
    if (configured) urls.push(configured);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (appUrl) urls.push(`${appUrl.replace(/\/$/, '')}/api/webhooks/whatsapp`);

    if (process.env.NODE_ENV !== 'production') {
        const unsignedAllowed = process.env.TWILIO_ALLOW_UNSIGNED_WEBHOOK === 'true';
        if (unsignedAllowed) urls.push(requestUrl);
    }

    return [...new Set(urls)];
}

/** Whether unsigned traffic may be processed (local development only). */
function unsignedTrafficAllowed(): boolean {
    return process.env.NODE_ENV !== 'production' && process.env.TWILIO_ALLOW_UNSIGNED_WEBHOOK === 'true';
}

/** Appends a delivery record. Never throws: forensics must not break intake. */
async function recordEvent(
    supabase: ReturnType<typeof createSupabaseAdminClient> | null,
    entry: {
        messageSid: string | null;
        fromNumber: string | null;
        signatureValid: boolean;
        outcome: Outcome;
        httpStatus: number;
        detail?: string;
        payloadDigest: string;
    },
): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('whatsapp_webhook_events').insert({
        message_sid: entry.messageSid,
        from_number: entry.fromNumber,
        signature_valid: entry.signatureValid,
        outcome: entry.outcome,
        http_status: entry.httpStatus,
        detail: entry.detail?.slice(0, 500) ?? null,
        payload_digest: entry.payloadDigest,
    });
    if (error) {
        console.error('[whatsapp/webhook] Failed to record delivery event:', error.message);
    }
}

/** Audit-trail entry for a report that was accepted into quarantine/review. */
async function recordAudit(
    supabase: ReturnType<typeof createSupabaseAdminClient> | null,
    entry: {
        organizationId: string;
        reportId: string;
        action: string;
        values: Record<string, unknown>;
    },
): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase.from('audit_logs').insert({
        organization_id: entry.organizationId,
        user_id: null,
        action: entry.action,
        entity_type: 'field_report',
        entity_id: entry.reportId,
        new_values: entry.values,
    });
    if (error) {
        console.error('[whatsapp/webhook] Failed to write audit log:', error.message);
    }
}

export async function POST(request: Request) {
    const rawBody = await request.text();
    const payloadDigest = digestPayload(rawBody);

    const params: Record<string, string> = {};
    for (const [key, value] of new URLSearchParams(rawBody)) {
        if (!(key in params)) params[key] = value;
    }

    const messageSid = params.MessageSid?.trim() || null;
    const fromNumber = normalizePhoneNumber(params.From);
    const messageBody = (params.Body ?? '').trim();

    if (rawBody.length > MAX_BODY_LENGTH) {
        return json({ error: 'Payload too large.' }, 413);
    }

    // ---- 1. Signature verification (fail closed) -------------------------
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const allowUnsigned = unsignedTrafficAllowed();

    if (!authToken && !allowUnsigned) {
        console.error('[whatsapp/webhook] Refused delivery: TWILIO_AUTH_TOKEN is not configured.');
        return json({ error: 'Field-report intake is not configured.' }, 503);
    }

    const signatureCheck = authToken
        ? verifyTwilioSignature({
              authToken,
              signature: request.headers.get('x-twilio-signature'),
              candidateUrls: candidateUrls(request.url),
              params,
          })
        : { valid: true, matchedUrl: 'unsigned-development', reason: undefined };

    if (!signatureCheck.valid) {
        console.error(`[whatsapp/webhook] Rejected delivery: ${signatureCheck.reason}`);
        return json({ error: 'Invalid signature.' }, 403);
    }

    let supabase: ReturnType<typeof createSupabaseAdminClient> | null = null;
    try {
        supabase = createSupabaseAdminClient();
    } catch {
        console.error('[whatsapp/webhook] Service role key is not configured.');
        return json({ error: 'Field-report intake is not configured.' }, 503);
    }

    const record = (entry: Parameters<typeof recordEvent>[1]) => recordEvent(supabase, entry);

    try {
        // ---- 2. Replay / retry protection ---------------------------------
        if (messageSid) {
            const { data: seen } = await supabase
                .from('whatsapp_webhook_events')
                .select('id')
                .eq('message_sid', messageSid)
                .maybeSingle();

            if (seen) {
                console.warn(`[whatsapp/webhook] Duplicate delivery ignored (${messageSid}).`);
                return twiml('This report was already received. No duplicate was recorded.');
            }
        }

        // ---- 3. Sender must be an approved reporter ------------------------
        if (!fromNumber) {
            await record({
                messageSid,
                fromNumber: null,
                signatureValid: true,
                outcome: 'invalid_payload',
                httpStatus: 200,
                detail: 'Unusable From number.',
                payloadDigest,
            });
            return twiml(`Could not read the sender number. Send: ${FIELD_REPORT_GUIDANCE}`);
        }

        const { data: sender, error: senderErr } = await supabase
            .from('field_report_senders')
            .select('id, organization_id, default_project_id, status')
            .eq('phone_number_e164', fromNumber)
            .maybeSingle();

        if (senderErr) throw new Error(senderErr.message);

        if (!sender || sender.status !== 'active') {
            await record({
                messageSid,
                fromNumber,
                signatureValid: true,
                outcome: 'unknown_sender',
                httpStatus: 200,
                detail: sender ? `Sender status: ${sender.status}` : 'Number is not registered.',
                payloadDigest,
            });
            return twiml(
                `This number is not approved to submit field reports yet. Ask your coordinator to add it. Format: ${FIELD_REPORT_GUIDANCE}`,
            );
        }

        const organizationId = sender.organization_id as string;
        await supabase
            .from('field_report_senders')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', sender.id);

        const idempotencyKey = messageSid ? `twilio:${messageSid}` : `digest:${payloadDigest}`;
        const parsed = parseFieldReport(messageBody);

        // ---- 4a. Unreadable: quarantine for human review -------------------
        if (!parsed.ok) {
            const { error: quarantineErr } = await supabase.from('field_reports').insert({
                organization_id: organizationId,
                sender_id: sender.id,
                project_id: sender.default_project_id ?? null,
                metric_id: null,
                message_sid: messageSid ?? `unsigned-${payloadDigest.slice(0, 40)}`,
                idempotency_key: idempotencyKey,
                project_code: 'unresolved',
                metric_code: 'unresolved',
                quantity: null,
                location: 'unresolved',
                note: null,
                raw_text: messageBody || '(empty message)',
                from_number: fromNumber,
                validation_state: 'quarantined',
                validation_reason: `${parsed.code}: ${parsed.missing.join(', ') || 'unreadable message'}`,
            });

            if (quarantineErr) {
                if (quarantineErr.code === '23505') {
                    return twiml('This report was already received. No duplicate was recorded.');
                }
                throw new Error(quarantineErr.message);
            }

            await record({
                messageSid,
                fromNumber,
                signatureValid: true,
                outcome: 'quarantined',
                httpStatus: 200,
                detail: parsed.code,
                payloadDigest,
            });

            return twiml(
                `Your message was received but could not be read. It is quarantined for review. Format: ${FIELD_REPORT_GUIDANCE}`,
            );
        }

        // ---- 4b. Resolve PROJECT + METRIC against this organization --------
        const [{ data: project }, { data: metric }] = await Promise.all([
            supabase
                .from('projects')
                .select('id, slug')
                .eq('organization_id', organizationId)
                .eq('slug', parsed.projectCode)
                .maybeSingle(),
            supabase
                .from('impact_metrics')
                .select('id, slug, unit')
                .eq('organization_id', organizationId)
                .eq('slug', parsed.metricCode)
                .maybeSingle(),
        ]);

        const unresolved: string[] = [];
        if (!project) unresolved.push(`PROJECT:${parsed.projectCode}`);
        if (!metric) unresolved.push(`METRIC:${parsed.metricCode}`);
        const reviewable = unresolved.length === 0;

        const { data: report, error: reportErr } = await supabase
            .from('field_reports')
            .insert({
                organization_id: organizationId,
                sender_id: sender.id,
                project_id: project?.id ?? sender.default_project_id ?? null,
                metric_id: metric?.id ?? null,
                message_sid: messageSid ?? `unsigned-${payloadDigest.slice(0, 40)}`,
                idempotency_key: idempotencyKey,
                project_code: parsed.projectCode,
                metric_code: parsed.metricCode,
                quantity: parsed.quantity,
                location: parsed.location,
                note: parsed.note,
                raw_text: parsed.rawText,
                from_number: fromNumber,
                validation_state: reviewable ? 'pending_review' : 'quarantined',
                validation_reason: reviewable
                    ? `Awaiting verification (expected ${parsed.quantity} ${metric?.unit ?? 'units'}).`
                    : `Unresolved identifiers: ${unresolved.join(', ')}`,
                received_at: parsed.reportedAt ? `${parsed.reportedAt}T00:00:00.000Z` : undefined,
            })
            .select('id')
            .single();

        if (reportErr) {
            if (reportErr.code === '23505') {
                return twiml('This report was already received. No duplicate was recorded.');
            }
            throw new Error(reportErr.message);
        }

        if (report?.id) {
            await recordAudit(supabase, {
                organizationId,
                reportId: report.id,
                action: reviewable ? 'field_report.received' : 'field_report.quarantined',
                values: {
                    message_sid: messageSid,
                    project_code: parsed.projectCode,
                    metric_code: parsed.metricCode,
                    quantity: parsed.quantity,
                    location: parsed.location,
                    validation_state: reviewable ? 'pending_review' : 'quarantined',
                },
            });
        }

        await record({
            messageSid,
            fromNumber,
            signatureValid: true,
            outcome: reviewable ? 'accepted' : 'quarantined',
            httpStatus: 200,
            detail: reviewable ? 'pending_review' : unresolved.join(', '),
            payloadDigest,
        });

        // ---- 5. Honest status reply ---------------------------------------
        if (!reviewable) {
            return twiml(
                `Received: ${parsed.quantity} at ${parsed.location}. It could not be matched to a project and indicator (${unresolved.join(', ')}), so it is quarantined for review.`,
            );
        }

        return twiml(
            `Received: ${parsed.quantity} ${metric?.unit ?? parsed.metricCode} at ${parsed.location}. Status: pending review by your organisation.`,
        );
    } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        console.error('[whatsapp/webhook] Intake failed:', detail);
        await record({
            messageSid,
            fromNumber,
            signatureValid: true,
            outcome: 'error',
            httpStatus: 500,
            detail,
            payloadDigest,
        });
        return json({ error: 'Webhook processing failed.' }, 500);
    }
}
