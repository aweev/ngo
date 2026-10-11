/**
 * Lightweight HTML sanitization using native DOMParser (Node.js 22+).
 * No external dependencies required.
 */

/**
 * Allowed HTML tags for CMS content sanitization.
 * Conservative list for NGO content - no scripts, no iframes, no forms.
 */
export const ALLOWED_TAGS = [
    // Text formatting
    'p', 'br', 'strong', 'em', 'u', 's', 'mark', 'small', 'sub', 'sup',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Links
    'a',
    // Block elements
    'blockquote', 'pre', 'code', 'hr',
    // Tables
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // Media
    'img', 'figure', 'figcaption',
];

/**
 * Allowed attributes for each tag.
 */
export const ALLOWED_ATTRS: Record<string, string[]> = {
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    figure: ['class'],
    figcaption: ['class'],
    code: ['class'],
    pre: ['class'],
    th: ['scope', 'colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
    '*': ['class', 'id'], // Global attributes
};

/**
 * Tags that are always forbidden.
 */
export const FORBIDDEN_TAGS = [
    'script', 'iframe', 'form', 'input', 'button', 'select', 'textarea',
    'style', 'link', 'meta', 'object', 'embed', 'video', 'audio', 'source', 'track',
];

/**
 * Attributes that are always forbidden.
 */
export const FORBIDDEN_ATTRS = [
    'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
    'onchange', 'onsubmit', 'style',
];

/**
 * Sanitize HTML content using native DOMParser.
 * Available in Node.js 22+.
 */
export function sanitizeHtml(html: string): string {
    if (!html || typeof html !== 'string') return '';

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Remove forbidden tags
        for (const tag of FORBIDDEN_TAGS) {
            const elements = doc.querySelectorAll(tag);
            for (const el of elements) {
                el.remove();
            }
        }

        // Remove forbidden attributes and validate allowed ones
        const allElements = doc.querySelectorAll('*');
        for (const el of allElements) {
            const tagName = el.tagName.toLowerCase();
            const allowedAttrs = ALLOWED_ATTRS[tagName] ?? [];
            const globalAttrs = ALLOWED_ATTRS['*'] ?? [];
            const allAllowed = [...allowedAttrs, ...globalAttrs];

            const attrs = Array.from(el.attributes);
            for (const attr of attrs) {
                const name = attr.name.toLowerCase();
                if (FORBIDDEN_ATTRS.includes(name) || !allAllowed.includes(name)) {
                    el.removeAttribute(attr.name);
                }
                // Validate href for javascript: protocol
                if (name === 'href' && attr.value.startsWith('javascript:')) {
                    el.removeAttribute('href');
                }
                // Add rel="noopener noreferrer" for external links
                if (name === 'target' && attr.value === '_blank') {
                    const rel = el.getAttribute('rel') || '';
                    if (!rel.includes('noopener')) {
                        el.setAttribute('rel', rel + ' noopener noreferrer'.trim());
                    }
                }
            }
        }

        return doc.body.innerHTML;
    } catch {
        return '';
    }
}

/**
 * Sanitize rich HTML content (alias for sanitizeHtml with rich text rules).
 * Keeps formatting tags that prose styles rely on.
 */
export function sanitizeRichHtml(html: string): string {
    if (!html || typeof html !== 'string') return '';

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extended allowed tags for rich content
        const richAllowedTags = new Set([
            ...ALLOWED_TAGS,
            'div', 'span', 'section', 'article', 'aside', 'nav', 'header', 'footer', 'main',
        ]);

        // Remove forbidden tags
        for (const tag of FORBIDDEN_TAGS) {
            const elements = doc.querySelectorAll(tag);
            for (const el of elements) {
                el.remove();
            }
        }

        // Remove unknown tags not in allowed list
        const allElements = doc.querySelectorAll('*');
        for (const el of allElements) {
            const tagName = el.tagName.toLowerCase();
            if (!richAllowedTags.has(tagName)) {
                // Unwrap the element but keep its children
                const parent = el.parentNode;
                if (parent) {
                    while (el.firstChild) {
                        parent.insertBefore(el.firstChild, el);
                    }
                    parent.removeChild(el);
                }
                continue;
            }

            const allowedAttrs = ALLOWED_ATTRS[tagName] ?? [];
            const globalAttrs = ALLOWED_ATTRS['*'] ?? [];
            const allAllowed = [...allowedAttrs, ...globalAttrs];

            const attrs = Array.from(el.attributes);
            for (const attr of attrs) {
                const name = attr.name.toLowerCase();
                if (FORBIDDEN_ATTRS.includes(name) || !allAllowed.includes(name)) {
                    el.removeAttribute(attr.name);
                }
                if (name === 'href' && attr.value.startsWith('javascript:')) {
                    el.removeAttribute('href');
                }
                if (name === 'target' && attr.value === '_blank') {
                    const rel = el.getAttribute('rel') || '';
                    if (!rel.includes('noopener')) {
                        el.setAttribute('rel', rel + ' noopener noreferrer'.trim());
                    }
                }
            }
        }

        return doc.body.innerHTML;
    } catch {
        return '';
    }
}

/**
 * Convert HTML to plain text by stripping all tags.
 */
export function htmlToPlainText(html: string | null | undefined): string {
    if (!html || typeof html !== 'string') return '';

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const text = doc.body.textContent || '';
        return text
            .replace(/\s+/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .trim();
    } catch {
        return '';
    }
}

/**
 * Sanitize plain text (strip all HTML).
 */
export function stripHtml(html: string): string {
    return htmlToPlainText(html);
}

/**
 * Sanitize content for JSON-LD structured data (escape for JSON).
 */
export function sanitizeForJsonLd(text: string): string {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/</g, '<')
        .replace(/>/g, '>');
}

/**
 * Sanitize user-generated content for safe rendering.
 * More permissive than CMS content but still safe.
 */
export function sanitizeUGC(html: string): string {
    if (!html || typeof html !== 'string') return '';

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const ugcAllowedTags = new Set([
            ...ALLOWED_TAGS,
            'span', 'div', 'section', 'article', 'aside', 'nav', 'header', 'footer', 'main',
        ]);

        for (const tag of FORBIDDEN_TAGS) {
            const elements = doc.querySelectorAll(tag);
            for (const el of elements) {
                el.remove();
            }
        }

        const allElements = doc.querySelectorAll('*');
        for (const el of allElements) {
            const tagName = el.tagName.toLowerCase();
            if (!ugcAllowedTags.has(tagName)) {
                const parent = el.parentNode;
                if (parent) {
                    while (el.firstChild) {
                        parent.insertBefore(el.firstChild, el);
                    }
                    parent.removeChild(el);
                }
                continue;
            }

            const allowedAttrs = ALLOWED_ATTRS[tagName] ?? [];
            const globalAttrs = ALLOWED_ATTRS['*'] ?? [];
            const allAllowed = [...allowedAttrs, ...globalAttrs];

            const attrs = Array.from(el.attributes);
            for (const attr of attrs) {
                const name = attr.name.toLowerCase();
                if (FORBIDDEN_ATTRS.includes(name) || !allAllowed.includes(name)) {
                    el.removeAttribute(attr.name);
                }
                if (name === 'href' && attr.value.startsWith('javascript:')) {
                    el.removeAttribute('href');
                }
                if (name === 'target' && attr.value === '_blank') {
                    const rel = el.getAttribute('rel') || '';
                    if (!rel.includes('noopener')) {
                        el.setAttribute('rel', rel + ' noopener noreferrer'.trim());
                    }
                }
            }
        }

        return doc.body.innerHTML;
    } catch {
        return '';
    }
}