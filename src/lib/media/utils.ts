import { createHash } from "crypto";

/**
 * Generate a tiny base64 blur placeholder for an image.
 * Returns a data URL that can be used as blurDataUrl in Next.js Image.
 */
export async function generateBlurDataUrl(
    buffer: Buffer,
    width = 10,
    height = 10
): Promise<string> {
    // For production, you'd use sharp to resize and blur
    // This is a minimal implementation - replace with sharp in production
    const canvas = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
            <rect width="100%" height="100%" fill="#e5e7eb"/>
        </svg>
    `;
    return `data:image/svg+xml;base64,${Buffer.from(canvas).toString("base64")}`;
}

/**
 * Generate a low-quality image placeholder (LQIP) as base64.
 * Uses a simple average color approach.
 */
export function generateLQIP(buffer: Buffer, format: "jpeg" | "png" | "webp" = "jpeg"): string {
    // In production, use sharp: await sharp(buffer).resize(20, 20).blur(10).toBuffer()
    // This returns a minimal SVG placeholder
    return "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDIwIDIwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTBlN2ViIi8+PC9zdmc+";
}

/**
 * Calculate optimal responsive sizes for an image based on its aspect ratio.
 */
export function calculateSizes(
    aspectRatio: number,
    breakpoints: Record<string, number> = {
        mobile: 100,
        tablet: 50,
        desktop: 33,
    }
): string {
    return Object.entries(breakpoints)
        .map(([bp, vw]) => `(max-width: ${getBreakpointPx(bp)}px) ${vw}vw`)
        .join(", ") + ` ${breakpoints.desktop}vw`;
}

function getBreakpointPx(bp: string): number {
    const map: Record<string, number> = {
        mobile: 640,
        tablet: 1024,
        desktop: 1280,
        xl: 1536,
    };
    return map[bp] || 1280;
}

/**
 * Generate srcset entries for an image at different widths.
 */
export function generateSrcSet(
    baseUrl: string,
    widths: number[] = [320, 640, 960, 1280, 1920, 2560],
    format: "webp" | "avif" | "jpeg" = "webp"
): string {
    return widths
        .map((w) => `${baseUrl}?w=${w}&f=${format} ${w}w`)
        .join(", ");
}

/**
 * Extract dominant color from an image buffer (for placeholder background).
 * Returns hex color string.
 */
export async function extractDominantColor(buffer: Buffer): Promise<string> {
    // In production, use sharp or a color extraction library
    // For now, return a neutral gray
    return "#e5e7eb";
}

/**
 * Generate a unique filename for uploaded media.
 */
export function generateMediaFilename(originalName: string, prefix = "media"): string {
    const ext = originalName.split(".").pop()?.toLowerCase() || "bin";
    const hash = createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 12);
    return `${prefix}-${hash}.${ext}`;
}

/**
 * Validate image dimensions and aspect ratio.
 */
export function validateImageDimensions(
    width: number,
    height: number,
    options: {
        minWidth?: number;
        minHeight?: number;
        maxWidth?: number;
        maxHeight?: number;
        allowedRatios?: number[];
        ratioTolerance?: number;
    } = {}
): { valid: boolean; error?: string } {
    const {
        minWidth = 100,
        minHeight = 100,
        maxWidth = 5000,
        maxHeight = 5000,
        allowedRatios,
        ratioTolerance = 0.02,
    } = options;

    if (width < minWidth || height < minHeight) {
        return { valid: false, error: `Image too small (min ${minWidth}x${minHeight})` };
    }
    if (width > maxWidth || height > maxHeight) {
        return { valid: false, error: `Image too large (max ${maxWidth}x${maxHeight})` };
    }

    if (allowedRatios && allowedRatios.length > 0) {
        const ratio = width / height;
        const matches = allowedRatios.some((r) => Math.abs(r - ratio) <= ratioTolerance);
        if (!matches) {
            return {
                valid: false,
                error: `Aspect ratio ${ratio.toFixed(2)} not allowed. Allowed: ${allowedRatios.map((r) => r.toFixed(2)).join(", ")}`,
            };
        }
    }

    return { valid: true };
}

/**
 * Get recommended image sizes for different use cases.
 */
export const IMAGE_PRESETS = {
    hero: { width: 1920, height: 1080, aspectRatio: 16 / 9 },
    card: { width: 800, height: 600, aspectRatio: 4 / 3 },
    square: { width: 800, height: 800, aspectRatio: 1 },
    thumbnail: { width: 400, height: 300, aspectRatio: 4 / 3 },
    avatar: { width: 200, height: 200, aspectRatio: 1 },
    og: { width: 1200, height: 630, aspectRatio: 1.91 },
    story: { width: 1200, height: 800, aspectRatio: 1.5 },
} as const;

/**
 * Responsive image sizes for common layouts.
 */
export const RESPONSIVE_SIZES = {
    fullWidth: "100vw",
    halfWidth: "(max-width: 768px) 100vw, 50vw",
    thirdWidth: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    quarterWidth: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw",
    hero: "(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1200px",
} as const;