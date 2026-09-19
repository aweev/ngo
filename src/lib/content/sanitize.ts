import sanitizeHtml from 'sanitize-html';

/**
 * Server-side rich-text sanitizer for CMS content rendered with
 * `dangerouslySetInnerHTML` (article bodies, story narratives, content
 * page HTML blocks).
 *
 * Editors are trusted staff, but content also flows through the AI
 * translation pipeline and, in a future release, imported/entity
 * translations — so the render path must not assume well-formed HTML.
 * Strips scripts, inline event handlers, iframes, forms and any
 * non-HTTP(S) URL scheme while keeping the formatting the prose styles
 * rely on.
 */
const ALLOWED_TAGS = [
    'p', 'br', 'hr', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark', 'small',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'blockquote', 'pre', 'code',
    'a', 'img', 'figure', 'figcaption', 'picture', 'source',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
];

const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

export function sanitizeRichHtml(html: string | null | undefined): string {
    if (!html) return '';
    return sanitizeHtml(html, {
        allowedTags: ALLOWED_TAGS,
        allowedAttributes: {
            a: ['href', 'title', 'target', 'rel'],
            img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
            source: ['src', 'srcset', 'type', 'media'],
            '*': ['class', 'id'],
        },
        allowedSchemes: ALLOWED_SCHEMES,
        allowedSchemesByTag: { img: ALLOWED_SCHEMES },
        allowProtocolRelative: false,
        // Drop the contents of these entirely rather than escaping them.
        nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript', 'iframe'],
        transformTags: {
            // Never leak referrers or grant opener access to external links.
            a: sanitizeHtml.simpleTransform('a', {
                rel: 'noopener noreferrer nofollow',
            }),
        },
    });
}

/** Plain-text variant for meta descriptions and excerpts built from HTML. */
export function htmlToPlainText(html: string | null | undefined): string {
    if (!html) return '';
    const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
    return text.replace(/\s+/g, ' ').trim();
}
