import { describe, expect, it } from 'vitest';
import {
    buildTrustDocumentPath,
    clampSignedUrlTtl,
    detectTrustDocumentType,
    sanitizeStorageFileName,
    sha256Hex,
    stripImageMetadata,
    stripJpegMetadata,
    stripPngMetadata,
} from '@/lib/trust-documents';

const enc = (s: string) => new TextEncoder().encode(s);

function concat(parts: Uint8Array[]): Uint8Array {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of parts) {
        out.set(p, o);
        o += p.length;
    }
    return out;
}

const PNG_SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngChunk(type: string, data: Uint8Array): Uint8Array {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    // CRC intentionally zeroed — the stripper does not validate CRCs.
    return out;
}

function makePng(): Uint8Array {
    return concat([
        PNG_SIG,
        pngChunk('IHDR', new Uint8Array(13).fill(1)),
        pngChunk('tEXt', enc('Comment\0secret-location')),
        pngChunk('tIME', enc('20260101120000')),
        pngChunk('IDAT', new Uint8Array([1, 2, 3, 4])),
        pngChunk('IEND', new Uint8Array(0)),
    ]);
}

function jpegSeg(marker: number, payload: Uint8Array): Uint8Array {
    const len = payload.length + 2;
    return concat([new Uint8Array([0xff, marker, (len >> 8) & 0xff, len & 0xff]), payload]);
}

function makeJpeg(): Uint8Array {
    return concat([
        new Uint8Array([0xff, 0xd8]),
        jpegSeg(0xe0, enc('JFIF\0abc')),
        jpegSeg(0xe1, concat([enc('Exif\0\0'), new Uint8Array([0x4d, 0x4d, 0x00, 0x2a])])),
        jpegSeg(0xfe, enc('taken-with-secret-phone')),
        jpegSeg(0xda, new Uint8Array([0x01, 0x02])),
        new Uint8Array([0x11, 0x22, 0xff, 0xd9]),
    ]);
}

const latin1 = (b: Uint8Array) => String.fromCharCode(...b);

describe('detectTrustDocumentType', () => {
    it('accepts a real PDF', () => {
        expect(detectTrustDocumentType(enc('%PDF-1.7\n%âãÏÓ'), 'application/pdf')).toEqual({
            ok: true,
            mime: 'application/pdf',
        });
    });

    it('accepts a real PNG and JPEG', () => {
        expect(detectTrustDocumentType(makePng(), 'image/png')).toEqual({ ok: true, mime: 'image/png' });
        expect(detectTrustDocumentType(makeJpeg(), 'image/jpeg')).toEqual({ ok: true, mime: 'image/jpeg' });
    });

    it('detects GIF and WebP by magic bytes', () => {
        expect(detectTrustDocumentType(enc('GIF89a....'), 'image/gif').ok).toBe(true);
        const webp = concat([enc('RIFF'), new Uint8Array([4, 0, 0, 0]), enc('WEBP')]);
        expect(detectTrustDocumentType(webp, 'image/webp')).toEqual({ ok: true, mime: 'image/webp' });
    });

    it('treats UTF-8 text as text/plain even when declared as CSV', () => {
        expect(detectTrustDocumentType(enc('name,amount\nJürgen,10\n'), 'text/csv')).toEqual({
            ok: true,
            mime: 'text/plain',
        });
    });

    it('rejects a mismatch between content and declared type', () => {
        const r = detectTrustDocumentType(makeJpeg(), 'image/png');
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.reason).toContain('does not match');
    });

    it('rejects SVG regardless of content', () => {
        expect(detectTrustDocumentType(enc('<svg onload="alert(1)"></svg>'), 'image/svg+xml').ok).toBe(false);
    });

    it('rejects empty and binary-blob files', () => {
        expect(detectTrustDocumentType(new Uint8Array(0), 'text/plain').ok).toBe(false);
        const binary = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0x00]);
        expect(detectTrustDocumentType(binary, 'application/pdf').ok).toBe(false);
    });
});

describe('stripPngMetadata', () => {
    it('removes text/time chunks and keeps image data', () => {
        const original = makePng();
        const stripped = stripPngMetadata(original);
        expect(stripped).not.toBeNull();
        const text = latin1(stripped!);
        expect(text).not.toContain('secret-location');
        expect(text).not.toContain('20260101120000');
        expect(text).toContain('IHDR');
        expect(text).toContain('IDAT');
        expect(text).toContain('IEND');
        expect(stripped!.length).toBeLessThan(original.length);
        expect(Array.from(stripped!.subarray(0, 8))).toEqual(Array.from(PNG_SIG));
    });

    it('returns null for malformed streams', () => {
        expect(stripPngMetadata(enc('not a png'))).toBeNull();
        expect(stripPngMetadata(makePng().subarray(0, 20))).toBeNull();
    });
});

describe('stripJpegMetadata', () => {
    it('removes EXIF/comment segments and keeps the scan', () => {
        const original = makeJpeg();
        const stripped = stripJpegMetadata(original);
        expect(stripped).not.toBeNull();
        const text = latin1(stripped!);
        expect(text).not.toContain('Exif');
        expect(text).not.toContain('taken-with-secret-phone');
        expect(text).toContain('JFIF');
        // Scan bytes (entropy + EOI) survive verbatim.
        expect(stripped![stripped!.length - 2]).toBe(0xff);
        expect(stripped![stripped!.length - 1]).toBe(0xd9);
        expect(stripped!.length).toBeLessThan(original.length);
    });

    it('returns null for malformed streams', () => {
        expect(stripJpegMetadata(enc('nope'))).toBeNull();
        expect(stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0x00, 0x01]))).toBeNull();
        expect(stripJpegMetadata(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff, 0x00]))).toBeNull();
    });
});

describe('stripImageMetadata', () => {
    it('flags stripping only when bytes changed', () => {
        expect(stripImageMetadata(makePng(), 'image/png')!.stripped).toBe(true);
        expect(stripImageMetadata(makeJpeg(), 'image/jpeg')!.stripped).toBe(true);
    });

    it('passes non-rewritten types through unchanged', () => {
        const gif = enc('GIF89a');
        expect(stripImageMetadata(gif, 'image/gif')).toEqual({ bytes: gif, stripped: false });
    });

    it('returns null for corrupt images', () => {
        expect(stripImageMetadata(enc('broken'), 'image/png')).toBeNull();
        expect(stripImageMetadata(new Uint8Array([0xff, 0xd8, 0x00]), 'image/jpeg')).toBeNull();
    });
});

describe('sha256Hex', () => {
    it('matches the known digest of "abc"', () => {
        expect(sha256Hex(enc('abc'))).toBe(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        );
    });
});

describe('sanitizeStorageFileName', () => {
    it('strips path traversal and separators', () => {
        expect(sanitizeStorageFileName('../../etc/passwd')).toBe('passwd');
        expect(sanitizeStorageFileName('..\\..\\secrets.txt')).toBe('secrets.txt');
        expect(sanitizeStorageFileName('.env')).toBe('env');
    });

    it('removes control and OS-illegal characters but keeps unicode', () => {
        expect(sanitizeStorageFileName('rapport <v2>: "final"?.pdf')).toBe('rapport_v2_final.pdf');
        expect(sanitizeStorageFileName('Bericht Über Wörter.txt')).toBe('Bericht_Über_Wörter.txt');
        expect(sanitizeStorageFileName('a b')).toBe('a_b');
    });

    it('caps length and never returns an empty string', () => {
        expect(sanitizeStorageFileName('x'.repeat(300))).toHaveLength(120);
        expect(sanitizeStorageFileName('')).toBe('document');
        expect(sanitizeStorageFileName('...')).toBe('document');
    });
});

describe('buildTrustDocumentPath', () => {
    it('builds <org>/<doc>/<sanitised name>', () => {
        expect(buildTrustDocumentPath('org-1', 'doc-1', 'proof of receipt.pdf')).toBe(
            'org-1/doc-1/proof_of_receipt.pdf',
        );
    });
});

describe('clampSignedUrlTtl', () => {
    it('clamps to [60, 3600] and defaults non-finite input', () => {
        expect(clampSignedUrlTtl(10)).toBe(60);
        expect(clampSignedUrlTtl(300)).toBe(300);
        expect(clampSignedUrlTtl(999_999)).toBe(3600);
        expect(clampSignedUrlTtl(Number.NaN)).toBe(300);
    });
});


