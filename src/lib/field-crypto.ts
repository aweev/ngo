/**
 * Field PII encryption (Phase 1).
 *
 * Server-only module. Beneficiary names and phone numbers are encrypted with
 * AES-256-GCM before they reach Postgres; lookup and duplicate checks run on
 * deterministic blind-index hashes, never on cleartext.
 *
 * Key discipline: one passphrase from ENCRYPTION_KEY, per-organization salt.
 * Production refuses to store PII without a configured key. Non-production
 * falls back to a documented dev key with a loud warning so local setups and
 * tests keep working.
 */
import { decryptField, deriveKey, encryptField, hashSearchable } from '@/lib/encryption';

function passphrase(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (key) return key;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('ENCRYPTION_KEY is not set — refusing to handle beneficiary PII.');
    }
    console.warn('[field-crypto] ENCRYPTION_KEY is not set; using an insecure dev fallback. Set a 32+ char secret.');
    return 'ngo-os-insecure-dev-only-do-not-use-in-production';
}

function saltFor(organizationId: string): string {
    return `field-pii:${organizationId}`;
}

/** Encrypts one PII value for storage. Throws in production without a key. */
export async function encryptPii(plainText: string, organizationId: string): Promise<string> {
    const key = await deriveKey(passphrase(), saltFor(organizationId));
    return encryptField(plainText, key);
}

/** Decrypts one PII value for an authorized reader. */
export async function decryptPii(cipherText: string, organizationId: string): Promise<string> {
    const key = await deriveKey(passphrase(), saltFor(organizationId));
    return decryptField(cipherText, key);
}

/**
 * Blind index for a name: normalized (trim + lowercase), deterministic per
 * organization. Two records with the same hash are duplicate candidates.
 */
export async function nameSearchHash(name: string, organizationId: string): Promise<string> {
    return hashSearchable(name, saltFor(organizationId));
}
