import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
    computeTwilioSignature,
    digestPayload,
    normalizePhoneNumber,
    safeCompare,
    verifyTwilioSignature,
} from '@/lib/whatsapp-signature';

const TOKEN = '0f1e2d3c4b5a69788796a5b4c3d2e1f0';
const PUBLIC_URL = 'https://ngo.example.org/api/webhooks/whatsapp';

const params = {
    From: 'whatsapp:+4915123456789',
    Body: 'PROJECT=water METRIC=filters VALUE=12 LOCATION=Sector 4',
    MessageSid: 'SM1234567890abcdef',
    To: 'whatsapp:+4915000000000',
};

describe('computeTwilioSignature', () => {
    it('signs url + sorted params (Twilio algorithm)', () => {
        // Independent re-implementation of the documented algorithm.
        const expected = createHmac('sha1', TOKEN)
            .update(
                PUBLIC_URL +
                    'Body' + params.Body +
                    'From' + params.From +
                    'MessageSid' + params.MessageSid +
                    'To' + params.To,
            )
            .digest('base64');

        expect(computeTwilioSignature(TOKEN, PUBLIC_URL, params)).toBe(expected);
    });

    it('is order-independent for the parameter object', () => {
        const reordered = {
            To: params.To,
            MessageSid: params.MessageSid,
            Body: params.Body,
            From: params.From,
        };
        expect(computeTwilioSignature(TOKEN, PUBLIC_URL, reordered))
            .toBe(computeTwilioSignature(TOKEN, PUBLIC_URL, params));
    });
});

describe('verifyTwilioSignature', () => {
    const signature = computeTwilioSignature(TOKEN, PUBLIC_URL, params);

    it('accepts a signature computed over the configured callback URL', () => {
        const result = verifyTwilioSignature({
            authToken: TOKEN,
            signature,
            candidateUrls: [PUBLIC_URL],
            params,
        });
        expect(result.valid).toBe(true);
        expect(result.matchedUrl).toBe(PUBLIC_URL);
    });

    it('accepts when any candidate URL matches (proxy-aware)', () => {
        const result = verifyTwilioSignature({
            authToken: TOKEN,
            signature,
            candidateUrls: ['https://internal-ip:3000/api/webhooks/whatsapp', PUBLIC_URL],
            params,
        });
        expect(result.valid).toBe(true);
    });

    it('rejects a tampered body even with a valid-looking signature', () => {
        const tampered = { ...params, Body: 'PROJECT=water METRIC=filters VALUE=99999 LOCATION=Sector 4' };
        const result = verifyTwilioSignature({
            authToken: TOKEN,
            signature,
            candidateUrls: [PUBLIC_URL],
            params: tampered,
        });
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('mismatch');
    });

    it('rejects a signature computed over a different URL', () => {
        const attackerSignature = computeTwilioSignature(TOKEN, 'https://evil.example.org/hook', params);
        const result = verifyTwilioSignature({
            authToken: TOKEN,
            signature: attackerSignature,
            candidateUrls: [PUBLIC_URL],
            params,
        });
        expect(result.valid).toBe(false);
    });

    it('fails closed without a signature or without an auth token', () => {
        expect(verifyTwilioSignature({ authToken: TOKEN, signature: null, candidateUrls: [PUBLIC_URL], params }).reason)
            .toBe('missing_signature');
        expect(verifyTwilioSignature({ authToken: undefined, signature, candidateUrls: [PUBLIC_URL], params }).reason)
            .toBe('missing_auth_token');
        expect(verifyTwilioSignature({ authToken: TOKEN, signature, candidateUrls: [], params }).reason)
            .toBe('no_candidate_url');
    });
});

describe('safeCompare', () => {
    it('compares equal strings and rejects different ones without throwing', () => {
        expect(safeCompare('abc', 'abc')).toBe(true);
        expect(safeCompare('abc', 'abd')).toBe(false);
        expect(safeCompare('abc', 'abcdef')).toBe(false);
        expect(safeCompare('', '')).toBe(true);
    });
});

describe('digestPayload', () => {
    it('is stable and does not return the payload', () => {
        const digest = digestPayload('PROJECT=water METRIC=filters VALUE=12');
        expect(digest).toHaveLength(64);
        expect(digest).toBe(digestPayload('PROJECT=water METRIC=filters VALUE=12'));
        expect(digest).not.toContain('PROJECT');
    });
});

describe('normalizePhoneNumber', () => {
    it('normalises Twilio whatsapp: prefixed numbers', () => {
        expect(normalizePhoneNumber('whatsapp:+4915123456789')).toBe('+4915123456789');
        expect(normalizePhoneNumber('+49 151 2345 6789')).toBe('+4915123456789');
    });

    it('rejects unusable input', () => {
        expect(normalizePhoneNumber(null)).toBeNull();
        expect(normalizePhoneNumber('')).toBeNull();
        expect(normalizePhoneNumber('anonymous')).toBeNull();
        expect(normalizePhoneNumber('+123')).toBeNull();
    });
});
