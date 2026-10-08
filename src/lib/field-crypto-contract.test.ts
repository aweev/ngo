import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

import { decryptPii, encryptPii, nameSearchHash } from '@/lib/field-crypto';

/**
 * Seed/App PII contract (scripts/seed-master.mjs).
 *
 * The seed script reimplements this module's crypto in plain Node because it
 * runs outside the TS bundle. This test pins the shared contract from the
 * app side: same passphrase + same org must decrypt what the documented
 * algorithm produces, and blind hashes must match exactly.
 *
 * If you change KDF parameters, payload layout, or hash format here, the
 * seed script MUST change in lockstep (and vice versa).
 */
const ORG = '00000000-0000-0000-0000-000000000001';

async function seedSideEncrypt(plainText: string, passphrase: string): Promise<string> {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode(`field-pii:${ORG}`), iterations: 100000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt'],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText)));
    const combined = new Uint8Array(iv.length + ct.length);
    combined.set(iv, 0);
    combined.set(ct, iv.length);
    return Buffer.from(combined).toString('base64');
}

function seedSideHash(name: string): string {
    return createHash('sha256')
        .update(`${name.trim().toLowerCase()}:field-pii:${ORG}`, 'utf8')
        .digest('hex');
}

describe('field PII seed/app contract', () => {
    beforeEach(() => {
        process.env.ENCRYPTION_KEY = 'test-32-char-passphrase-12345678';
    });

    it('app decrypts seed-side ciphertext (same key + org)', async () => {
        const cipher = await seedSideEncrypt('Amina Diallo (demo)', process.env.ENCRYPTION_KEY!);
        await expect(decryptPii(cipher, ORG)).resolves.toBe('Amina Diallo (demo)');
    });

    it('seed decrypts app-side ciphertext (round trip)', async () => {
        const cipher = await encryptPii('Brian Otieno (demo)', ORG);
        const raw = Buffer.from(cipher, 'base64');
        const enc = new TextEncoder();
        const base = await crypto.subtle.importKey('raw', enc.encode(process.env.ENCRYPTION_KEY!), 'PBKDF2', false, ['deriveKey']);
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: enc.encode(`field-pii:${ORG}`), iterations: 100000, hash: 'SHA-256' },
            base,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt'],
        );
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12));
        expect(new TextDecoder().decode(pt)).toBe('Brian Otieno (demo)');
    });

    it('blind hashes match exactly (duplicate detection depends on it)', async () => {
        await expect(nameSearchHash('  AmINa Diallo (DEMO) ', ORG)).resolves.toBe(seedSideHash('Amina Diallo (demo)'));
    });
});
