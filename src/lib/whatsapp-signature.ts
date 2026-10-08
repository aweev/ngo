import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Twilio request-signature verification.
 *
 * Twilio signs webhook requests with HMAC-SHA1 over the *public* request URL
 * followed by every POST parameter (sorted by key, `key` + `value`), keyed by
 * the account auth token, base64-encoded into `X-Twilio-Signature`.
 *
 * Two things make this easy to get wrong, and both are handled here:
 *   1. The URL must be the public callback URL. Behind a load balancer the
 *      request URL can differ, so callers pass the configured production
 *      callback URL as the primary candidate and the request URL only as a
 *      deliberate fallback.
 *   2. Comparison must be constant-time — a byte-by-byte `===` leaks the
 *      signature prefix to an attacker.
 */

/** Parameters exactly as Twilio documents them: sorted keys, then key+value. */
export function buildSignaturePayload(url: string, params: Record<string, string>): string {
    const sortedKeys = Object.keys(params).sort();
    let payload = url;
    for (const key of sortedKeys) {
        payload += key + params[key];
    }
    return payload;
}

/** Hex/`base64` HMAC-SHA1 signature for a request. */
export function computeTwilioSignature(
    authToken: string,
    url: string,
    params: Record<string, string>,
): string {
    return createHmac('sha1', authToken).update(buildSignaturePayload(url, params), 'utf8').digest('base64');
}

/** Constant-time string comparison that never throws on length mismatch. */
export function safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
}

export interface TwilioSignatureCheck {
    /** True when at least one candidate URL produced a matching signature. */
    valid: boolean;
    /** The URL that matched, when valid. */
    matchedUrl?: string;
    /** Non-sensitive reason for the rejection (for logs/audit). */
    reason?: 'missing_signature' | 'missing_auth_token' | 'no_candidate_url' | 'mismatch';
}

export interface VerifyTwilioSignatureOptions {
    authToken: string | undefined;
    signature: string | null;
    /** Candidate public URLs, most trusted first. */
    candidateUrls: readonly string[];
    params: Record<string, string>;
}

/**
 * Verifies an inbound Twilio webhook. Fails closed: a missing token, a missing
 * signature, or no candidate URL is a rejection, never a pass.
 */
export function verifyTwilioSignature({
    authToken,
    signature,
    candidateUrls,
    params,
}: VerifyTwilioSignatureOptions): TwilioSignatureCheck {
    if (!signature) return { valid: false, reason: 'missing_signature' };
    if (!authToken) return { valid: false, reason: 'missing_auth_token' };

    const urls = candidateUrls.filter((u) => typeof u === 'string' && u.length > 0);
    if (urls.length === 0) return { valid: false, reason: 'no_candidate_url' };

    for (const url of urls) {
        const expected = computeTwilioSignature(authToken, url, params);
        if (safeCompare(expected, signature)) {
            return { valid: true, matchedUrl: url };
        }
    }

    return { valid: false, reason: 'mismatch' };
}

/** SHA-256 of the raw body — replay evidence that stores no personal data. */
export function digestPayload(rawBody: string): string {
    return createHash('sha256').update(rawBody, 'utf8').digest('hex');
}

/** Normalises a phone number to E.164 (`+` + 8-15 digits) or returns null. */
export function normalizePhoneNumber(input: string | null | undefined): string | null {
    if (!input) return null;
    const digits = input.replace(/^whatsapp:/i, '').replace(/[^\d+]/g, '');
    const normalised = digits.startsWith('+') ? digits : `+${digits}`;
    return /^\+\d{8,15}$/.test(normalised) ? normalised : null;
}
