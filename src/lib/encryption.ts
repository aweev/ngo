/**
 * Field Encryption Utility using Web Crypto API (AES-GCM-256)
 *
 * Provides cryptographic safeguarding for PII (names, phone numbers, medical records,
 * precise GPS coordinates, vulnerable beneficiary details) before writing to database.
 */

const ENCRYPTION_ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH_BYTES = 12;

/**
 * Derives a CryptoKey from a secret passphrase and salt using PBKDF2.
 */
export async function deriveKey(passphrase: string, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passphraseKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: 100000,
            hash: 'SHA-256',
        },
        passphraseKey,
        { name: ENCRYPTION_ALGORITHM, length: KEY_LENGTH },
        false,
        ['encrypt', 'decrypt'],
    );
}

/**
 * Encrypts cleartext using AES-256-GCM.
 * Returns base64 string combining initialization vector (IV) and ciphertext.
 */
export async function encryptField(plainText: string, key: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
    const encodedText = encoder.encode(plainText);

    const cipherBuffer = await crypto.subtle.encrypt(
        { name: ENCRYPTION_ALGORITHM, iv },
        key,
        encodedText,
    );

    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuffer), iv.length);

    return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64 encrypted payload (IV + ciphertext) into plain text.
 */
export async function decryptField(encryptedPayload: string, key: CryptoKey): Promise<string> {
    const binaryString = atob(encryptedPayload);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        combined[i] = binaryString.charCodeAt(i);
    }

    const iv = combined.slice(0, IV_LENGTH_BYTES);
    const cipherText = combined.slice(IV_LENGTH_BYTES);

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: ENCRYPTION_ALGORITHM, iv },
        key,
        cipherText,
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
}

/**
 * Generates a deterministic SHA-256 hash for blind indexing / searchable encrypted fields.
 */
export async function hashSearchable(value: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${value.trim().toLowerCase()}:${salt}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
