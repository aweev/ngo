/**
 * Trust document helpers (audit Wave 1 secure document model).
 *
 * Plain server module (NOT 'use server') so it stays unit-testable:
 * magic-byte file-type verification, PNG/JPEG metadata stripping,
 * SHA-256 checksums, filename sanitising, and org-scoped storage paths.
 * Consumed by src/actions/documents.ts.
 */
import { createHash } from 'node:crypto';

/** Private bucket — no public SELECT policy; access via signed URLs only. */
export const TRUST_DOCUMENTS_BUCKET = 'trust-documents';

export const MAX_TRUST_DOCUMENT_BYTES = 25 * 1024 * 1024; // 25 MB

export const TRUST_DOCUMENT_CLASSIFICATIONS = [
    'public',
    'internal',
    'confidential',
    'highly_sensitive',
] as const;

export type TrustDocumentTypeResult =
    | { ok: true; mime: string }
    | { ok: false; reason: string };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, seq: number[], offset = 0): boolean {
    if (bytes.length < offset + seq.length) return false;
    for (let i = 0; i < seq.length; i++) if (bytes[offset + i] !== seq[i]) return false;
    return true;
}

function asciiAt(bytes: Uint8Array, text: string, offset = 0): boolean {
    if (bytes.length < offset + text.length) return false;
    for (let i = 0; i < text.length; i++) if (bytes[offset + i] !== text.charCodeAt(i)) return false;
    return true;
}

function readU32BE(bytes: Uint8Array, o: number): number {
    return (((bytes[o] << 24) >>> 0) + (bytes[o + 1] << 16) + (bytes[o + 2] << 8) + bytes[o + 3]) >>> 0;
}

function concatSlices(slices: Uint8Array[]): Uint8Array {
    let total = 0;
    for (const s of slices) total += s.length;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const s of slices) {
        out.set(s, offset);
        offset += s.length;
    }
    return out;
}

function isProbablyUtf8Text(bytes: Uint8Array): boolean {
    const probe = bytes.subarray(0, Math.min(bytes.length, 8192));
    for (const b of probe) if (b === 0) return false;
    try {
        new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        return true;
    } catch {
        return false;
    }
}

/** Identifies the REAL type of the bytes (magic numbers), never the client claim. */
function sniffMime(bytes: Uint8Array): string | null {
    if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'; // %PDF-
    if (startsWith(bytes, PNG_SIGNATURE)) return 'image/png';
    if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
    if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'image/gif'; // GIF8
    if (asciiAt(bytes, 'RIFF') && asciiAt(bytes, 'WEBP', 8)) return 'image/webp';
    if (asciiAt(bytes, 'ftyp', 4)) {
        const brand = String.fromCharCode(bytes[8] ?? 0, bytes[9] ?? 0, bytes[10] ?? 0, bytes[11] ?? 0);
        if (brand === 'avif' || brand === 'avis') return 'image/avif';
        return 'image/heic'; // heic/heix/hevc/mif1/msf1/...
    }
    if (isProbablyUtf8Text(bytes)) return 'text/plain';
    return null;
}

/**
 * File-type verification: sniffs magic bytes and requires the declared MIME
 * type (when present) to be compatible. SVG and everything unrecognised is
 * rejected — the malware gate (scan_state) only matters for known types.
 */
export function detectTrustDocumentType(
    bytes: Uint8Array,
    declaredMime: string | null | undefined,
): TrustDocumentTypeResult {
    if (bytes.length === 0) return { ok: false, reason: 'The file is empty.' };

    const declared = (declaredMime ?? '').split(';')[0].trim().toLowerCase();
    if (declared === 'image/svg+xml') {
        return { ok: false, reason: 'SVG files are not allowed. Upload a PNG or JPEG instead.' };
    }

    const detected = sniffMime(bytes);
    if (!detected) {
        return {
            ok: false,
            reason: 'Unsupported file type. Allowed: PDF, PNG, JPEG, GIF, WebP, HEIC, AVIF, or plain text (CSV/TXT).',
        };
    }

    if (!declared || declared === 'application/octet-stream') return { ok: true, mime: detected };
    if (declared === detected) return { ok: true, mime: detected };
    if (detected === 'text/plain' && declared.startsWith('text/')) return { ok: true, mime: detected };
    if (detected === 'image/jpeg' && declared === 'image/jpg') return { ok: true, mime: detected };
    if (detected === 'image/heic' && (declared === 'image/heif' || declared === 'image/heic')) {
        return { ok: true, mime: detected };
    }
    return {
        ok: false,
        reason: `File content (${detected}) does not match the declared type (${declared}).`,
    };
}

/** PNG ancillary chunks that leak creator/timestamp/comment/GPS metadata. */
const PNG_STRIP_CHUNKS = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

/**
 * Drops metadata chunks from a PNG (text, EXIF, modification time).
 * Returns null when the byte stream is not a well-formed PNG.
 */
export function stripPngMetadata(bytes: Uint8Array): Uint8Array | null {
    if (!startsWith(bytes, PNG_SIGNATURE)) return null;
    const slices: Uint8Array[] = [bytes.subarray(0, 8)];
    let pos = 8;
    let sawEnd = false;
    while (pos + 12 <= bytes.length) {
        const length = readU32BE(bytes, pos);
        const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
        const total = 12 + length;
        if (pos + total > bytes.length) return null;
        if (!PNG_STRIP_CHUNKS.has(type)) slices.push(bytes.subarray(pos, pos + total));
        pos += total;
        if (type === 'IEND') {
            sawEnd = true;
            break; // everything after IEND (hidden payloads) is discarded
        }
    }
    if (!sawEnd) return null;
    return concatSlices(slices);
}

/**
 * Drops metadata segments from a JPEG: COM, APP1 (EXIF/XMP), APP13
 * (Photoshop IRB / IPTC). Keeps JFIF (APP0), ICC (APP2), Adobe (APP14)
 * and the whole scan from SOS onward. Returns null when malformed.
 */
export function stripJpegMetadata(bytes: Uint8Array): Uint8Array | null {
    if (!startsWith(bytes, [0xff, 0xd8])) return null;
    const slices: Uint8Array[] = [bytes.subarray(0, 2)];
    let pos = 2;
    let sawScan = false;
    while (pos + 4 <= bytes.length) {
        if (bytes[pos] !== 0xff) return null;
        const marker = bytes[pos + 1];
        if (marker === 0xff) {
            pos += 1; // fill byte
            continue;
        }
        if (marker === 0xda) {
            // SOS: copy header + entropy-coded data (incl. EOI) verbatim.
            slices.push(bytes.subarray(pos));
            sawScan = true;
            pos = bytes.length;
            break;
        }
        if (marker === 0xd9) {
            slices.push(bytes.subarray(pos, pos + 2)); // EOI (validated below)
            pos += 2;
            break;
        }
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
            slices.push(bytes.subarray(pos, pos + 2)); // standalone markers
            pos += 2;
            continue;
        }
        const segLen = (bytes[pos + 2] << 8) | bytes[pos + 3];
        if (segLen < 2) return null;
        const segEnd = pos + 2 + segLen;
        if (segEnd > bytes.length) return null;
        const isMetadata = marker === 0xfe /* COM */ || marker === 0xe1 /* APP1 */ || marker === 0xed /* APP13 */;
        if (!isMetadata) slices.push(bytes.subarray(pos, segEnd));
        pos = segEnd;
    }
    if (!sawScan) return null;
    return concatSlices(slices);
}

export interface StripResult {
    bytes: Uint8Array;
    stripped: boolean;
}

/**
 * Metadata stripping entry point. PNG/JPEG are rewritten; other allowed
 * types pass through unchanged (only sniffed type + checksum are stored).
 * Returns null when an image is corrupt and must be rejected.
 */
export function stripImageMetadata(bytes: Uint8Array, mime: string): StripResult | null {
    if (mime === 'image/png') {
        const out = stripPngMetadata(bytes);
        return out ? { bytes: out, stripped: out.length !== bytes.length } : null;
    }
    if (mime === 'image/jpeg') {
        const out = stripJpegMetadata(bytes);
        return out ? { bytes: out, stripped: out.length !== bytes.length } : null;
    }
    return { bytes, stripped: false };
}

/** SHA-256 hex digest of the stored bytes (evidence integrity). */
export function sha256Hex(bytes: Uint8Array): string {
    return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Makes any client filename safe for a storage key: no path separators,
 * traversal, control bytes, or OS-illegal characters. Unicode letters and
 * numbers are preserved; never returns an empty string.
 */
export function sanitizeStorageFileName(rawName: string): string {
    const base = (rawName.split(/[\\/]/).pop() ?? '')
        .replace(/[\u0000-\u001f\u007f<>:"/\\|?*\u200b-\u200f\u2060]+/g, '')
        .replace(/\s+/g, '_')
        .replace(/^[.\s_]+/, '')
        .slice(0, 120);
    return base || 'document';
}

/** Storage key convention: <organization_id>/<document_id>/<file>. */
export function buildTrustDocumentPath(organizationId: string, documentId: string, fileName: string): string {
    return `${organizationId}/${documentId}/${sanitizeStorageFileName(fileName)}`;
}

/** Signed-URL lifetime: between 1 minute and 1 hour. */
export function clampSignedUrlTtl(seconds: number): number {
    if (!Number.isFinite(seconds)) return 300;
    return Math.min(Math.max(Math.round(seconds), 60), 3600);
}


