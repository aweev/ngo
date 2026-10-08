import { describe, it, expect } from 'vitest';
import { deriveKey, encryptField, decryptField, hashSearchable } from './encryption';

describe('Field Encryption (AES-256-GCM)', () => {
    it('should encrypt and decrypt sensitive cleartext correctly', async () => {
        const passphrase = 'ngo-super-secret-key-2026';
        const salt = 'organization-tenant-salt';
        const key = await deriveKey(passphrase, salt);

        const secretData = 'Refugee ID #98214 - Clinic Visit Details';
        const encrypted = await encryptField(secretData, key);

        expect(encrypted).toBeDefined();
        expect(typeof encrypted).toBe('string');
        expect(encrypted).not.toContain(secretData);

        const decrypted = await decryptField(encrypted, key);
        expect(decrypted).toBe(secretData);
    });

    it('should produce unique ciphertexts for identical inputs due to random IVs', async () => {
        const key = await deriveKey('passphrase', 'salt');
        const text = 'Confidential Location Coordinates';

        const enc1 = await encryptField(text, key);
        const enc2 = await encryptField(text, key);

        expect(enc1).not.toEqual(enc2);
        expect(await decryptField(enc1, key)).toBe(text);
        expect(await decryptField(enc2, key)).toBe(text);
    });

    it('should produce deterministic blind index hashes for searching', async () => {
        const salt = 'tenant-123';
        const val1 = 'John.Doe@example.org';
        const val2 = 'john.doe@example.org ';

        const hash1 = await hashSearchable(val1, salt);
        const hash2 = await hashSearchable(val2, salt);

        expect(hash1).toEqual(hash2);
        expect(hash1.length).toBe(64); // SHA-256 hex string length
    });
});
