import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    HONEYPOT_FIELD,
    alertAbuse,
    computeRiskScore,
    hashThrottleIdentity,
    honeypotTripped,
    riskLevel,
    verifyEdgeSecret,
    verifyHuman,
} from '@/lib/abuse-prevention';

/**
 * Abuse-prevention unit layer (audit Wave 0, item 3): honeypot, edge gate,
 * risk scoring and alerting. The CAPTCHA network call is not exercised here —
 * it is a third-party boundary; the pure decisions around it are.
 */

const MANAGED_ENV = [
    'EDGE_SHARED_SECRET',
    'ABUSE_ALERT_WEBHOOK_URL',
    'ABUSE_ALERT_MIN_SCORE',
    'ABUSE_HASH_SALT',
    'PUBLIC_CAPTCHA_MODE',
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
    saved = {};
    for (const key of MANAGED_ENV) {
        saved[key] = process.env[key];
        delete process.env[key];
    }
});

afterEach(() => {
    for (const key of MANAGED_ENV) {
        if (saved[key] === undefined) delete process.env[key];
        else process.env[key] = saved[key];
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('honeypotTripped', () => {
    it('ignores empty and whitespace-only honeypots', () => {
        expect(honeypotTripped({ [HONEYPOT_FIELD]: '' })).toBe(false);
        expect(honeypotTripped({ [HONEYPOT_FIELD]: '   ' })).toBe(false);
        expect(honeypotTripped({})).toBe(false);
    });

    it('trips on filled honeypots regardless of type', () => {
        expect(honeypotTripped({ [HONEYPOT_FIELD]: 'http://spam.example' })).toBe(true);
        expect(honeypotTripped({ [HONEYPOT_FIELD]: true })).toBe(true);
    });
});

describe('verifyEdgeSecret', () => {
    it('is disabled (and permissive) when no secret is configured', () => {
        expect(verifyEdgeSecret(null).ok).toBe(true);
        expect(verifyEdgeSecret('anything').ok).toBe(true);
    });

    it('fails closed when the edge secret is configured but the header is missing', () => {
        process.env.EDGE_SHARED_SECRET = 'edge-secret';
        const result = verifyEdgeSecret(null);
        expect(result.ok).toBe(false);
        expect(result.reason).toBeTruthy();
    });

    it('rejects a mismatched header and accepts the exact secret', () => {
        process.env.EDGE_SHARED_SECRET = 'edge-secret';
        expect(verifyEdgeSecret('edge-secre').ok).toBe(false);
        expect(verifyEdgeSecret('wrong-secret').ok).toBe(false);
        expect(verifyEdgeSecret('edge-secret').ok).toBe(true);
    });
});

describe('riskLevel', () => {
    it('maps scores onto the documented bands', () => {
        expect(riskLevel(0)).toBe('low');
        expect(riskLevel(24)).toBe('low');
        expect(riskLevel(25)).toBe('medium');
        expect(riskLevel(49)).toBe('medium');
        expect(riskLevel(50)).toBe('high');
        expect(riskLevel(74)).toBe('high');
        expect(riskLevel(75)).toBe('critical');
        expect(riskLevel(100)).toBe('critical');
    });
});

describe('computeRiskScore', () => {
    it('scores an untriggered submission as low risk', () => {
        expect(computeRiskScore([])).toEqual({ score: 0, level: 'low', signals: [] });
    });

    it('raises the score for a tripped honeypot', () => {
        const risk = computeRiskScore(['honeypot']);
        expect(risk.score).toBe(60);
        expect(risk.level).toBe('high');
        expect(risk.signals).toEqual(['honeypot']);
    });

    it('compounds independent signals but saturates at 100', () => {
        expect(computeRiskScore(['honeypot', 'captcha_failed']).score).toBe(83);
        expect(computeRiskScore(['honeypot', 'captcha_failed', 'rate_limited']).score).toBe(100);
        expect(computeRiskScore([
            'honeypot',
            'captcha_failed',
            'rate_limited',
            'edge_gate_failed',
            'self_identified_bot',
        ]).level).toBe('critical');
    });

    it('deduplicates repeated signals so a caller cannot inflate the score', () => {
        expect(computeRiskScore(['honeypot', 'honeypot']).score).toBe(60);
    });
});

describe('hashThrottleIdentity', () => {
    it('is deterministic and normalises casing/whitespace', () => {
        expect(hashThrottleIdentity(' Person@Example.org ')).toBe(hashThrottleIdentity('person@example.org'));
    });

    it('never exposes the raw value and separates distinct identities', () => {
        const digest = hashThrottleIdentity('person@example.org');
        expect(digest).not.toContain('person@example.org');
        expect(digest).toMatch(/^[0-9a-f]{64}$/);
        expect(digest).not.toBe(hashThrottleIdentity('someone-else@example.org'));
    });
});

describe('alertAbuse', () => {
    it('never calls the webhook when none is configured', async () => {
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);

        const risk = await alertAbuse({ surface: 'form', signals: ['honeypot'] });

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(risk.score).toBe(60);
    });

    it('silently skips alerts below the configured threshold', async () => {
        process.env.ABUSE_ALERT_WEBHOOK_URL = 'https://ops.example.org/hooks/abuse';
        process.env.ABUSE_ALERT_MIN_SCORE = '90';
        const fetchSpy = vi.fn();
        vi.stubGlobal('fetch', fetchSpy);

        await alertAbuse({ surface: 'form', signals: ['honeypot'] });

        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('posts a PII-free alert once the threshold is reached', async () => {
        process.env.ABUSE_ALERT_WEBHOOK_URL = 'https://ops.example.org/hooks/abuse';
        const fetchSpy = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchSpy);

        await alertAbuse({
            surface: 'donation',
            identity: hashThrottleIdentity('person@example.org'),
            signals: ['honeypot', 'captcha_failed'],
        });

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [url, init] = fetchSpy.mock.calls[0] as [string, { body: string; method: string }];
        expect(url).toBe('https://ops.example.org/hooks/abuse');
        expect(init.method).toBe('POST');

        const payload = JSON.parse(init.body) as Record<string, unknown>;
        expect(payload.surface).toBe('donation');
        expect(payload.level).toBe('critical');
        expect(payload.signals).toEqual(['honeypot', 'captcha_failed']);
        // The identity is hashed, never the raw email.
        expect(JSON.stringify(payload)).not.toContain('person@example.org');
    });

    it('swallows webhook failures so alerting can never break intake', async () => {
        process.env.ABUSE_ALERT_WEBHOOK_URL = 'https://ops.example.org/hooks/abuse';
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        await expect(
            alertAbuse({ surface: 'form', signals: ['rate_limited'] }),
        ).resolves.toMatchObject({ score: 40 });
    });
});

describe('verifyHuman', () => {
    it('rejects a tripped honeypot before any CAPTCHA work', async () => {
        const result = await verifyHuman({ [HONEYPOT_FIELD]: 'bot-filled' }, { surface: 'form' });
        expect(result).toEqual({ ok: false, reason: 'Submission rejected.' });
    });

    it('allows tokenless submissions when CAPTCHA is optional', async () => {
        await expect(verifyHuman({}, { surface: 'form' })).resolves.toEqual({ ok: true });
    });

    it('requires a token when PUBLIC_CAPTCHA_MODE=required', async () => {
        process.env.PUBLIC_CAPTCHA_MODE = 'required';
        const result = await verifyHuman({}, { surface: 'form' });
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('human verification');
    });
});
