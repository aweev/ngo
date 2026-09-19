/**
 * Slug + page-input validation for the CMS editor.
 * Single source of truth for slug rules used by the new/edit forms
 * and the server-side `checkSlugAvailable` / create / update actions.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/** Slugs reserved for system routes — never assignable to CMS pages. */
export const RESERVED_SLUGS = [
  'admin',
  'api',
  'auth',
  'dashboard',
  'public',
  'preview',
  'login',
  'register',
  'settings',
  'new',
  'edit',
] as const;

export const MAX_SLUG_LENGTH = 200;

/** "Homepage Hero!" -> "homepage-hero". Keeps slashes for nested slugs. */
export function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s\-\/]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^(-+|\/+)|(-+|\/+)$/g, '');
}

export function validateSlug(slug: string): { ok: boolean; error?: string } {
  const s = slug.trim();
  if (!s) return { ok: false, error: 'Slug is required.' };
  if (s.length > MAX_SLUG_LENGTH) return { ok: false, error: `Slug must be ${MAX_SLUG_LENGTH} characters or fewer.` };
  if (!SLUG_RE.test(s)) {
    return {
      ok: false,
      error: 'Use lowercase letters, numbers, and hyphens only (e.g. "about-mission-vision").',
    };
  }
  const first = s.split('/')[0];
  if ((RESERVED_SLUGS as readonly string[]).includes(first ?? '')) {
    return { ok: false, error: `"${first}" is a reserved word — pick a different slug.` };
  }
  return { ok: true };
}

/** Known CMS page categories (content.category). */
export const PAGE_CATEGORIES = [
  'page',
  'news',
  'story',
  'testimonial',
  'team_member',
  'milestone',
  'document',
] as const;
export type PageCategory = (typeof PAGE_CATEGORIES)[number];

/**
 * Recommended (not required) content keys per slug/category.
 * Shown as warnings in the editor — never blocking, so custom
 * pages stay possible while managed home/About sections guide
 * editors toward the keys the public site actually reads.
 */
const RECOMMENDED_KEYS: { match: (slug: string, category: string) => boolean; keys: string[] }[] = [
  { match: (slug) => slug === 'homepage-hero', keys: ['headline_primary', 'subheadline', 'primary_cta', 'primary_cta_link', 'secondary_cta'] },
  { match: (slug) => slug === 'homepage-mission', keys: ['preheadline', 'headline', 'description'] },
  { match: (slug) => slug === 'homepage-get-involved', keys: ['title', 'donor', 'volunteer', 'partner'] },
  { match: (slug) => slug === 'about-hero', keys: ['headline', 'lead'] },
  { match: (slug) => slug === 'about-mission-vision', keys: ['mission_title', 'mission_text', 'vision_title', 'vision_text'] },
  { match: (slug) => slug === 'about-values', keys: ['values'] },
  { match: (slug) => slug === 'about-theory', keys: ['steps'] },
  { match: (_slug, cat) => cat === 'team_member', keys: ['name', 'role', 'bio'] },
  { match: (_slug, cat) => cat === 'milestone', keys: ['year', 'title', 'description'] },
  { match: (_slug, cat) => cat === 'document', keys: ['file_url', 'year'] },
  { match: (_slug, cat) => cat === 'news', keys: ['excerpt', 'author_name'] },
  { match: (_slug, cat) => cat === 'story', keys: ['quote', 'name'] },
];

export function recommendedKeys(slug: string, category: string): string[] {
  const found = RECOMMENDED_KEYS.find((r) => r.match(slug, category));
  return found ? found.keys : [];
}

export function missingRecommendedKeys(
  slug: string,
  category: string,
  content: Record<string, unknown>,
): string[] {
  return recommendedKeys(slug, category).filter((k) => {
    const v = content[k];
    if (typeof v === 'string') return v.trim().length === 0;
    if (Array.isArray(v)) return v.length === 0;
    return v === null || v === undefined;
  });
}
