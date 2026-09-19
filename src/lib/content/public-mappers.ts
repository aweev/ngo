import type {
    ArticleDeepDiveViewModel,
    NewsViewModel,
    StoryDeepDiveViewModel,
    StoryRole,
    StoryTimelineEvent,
    StoryType,
    StoryViewModel,
    VolunteerRole,
} from '@/types/domain-adapters';
import {
    STORY_FORMATS,
    STORY_ROLES,
} from '@/types/domain-adapters';
import type {
    PublicImpactStory,
    PublicNewsArticle,
    PublicVolunteerRole,
} from '@/actions/public';
import { sanitizeRichHtml } from '@/lib/content/sanitize';

/**
 * Adapters from the public Supabase views (`public_news_articles`,
 * `public_impact_stories`, `public_volunteer_roles`) to the view models the
 * presentation components consume.
 *
 * Kept in one place so the hubs, the detail pages, the homepage rails and the
 * sitemap all agree on fallbacks and union-type validation.
 */

/** Editorial fallback imagery, used only when an editor has set no cover. */
export const FALLBACK_NEWS_IMAGE =
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&q=80';
export const FALLBACK_STORY_IMAGE =
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1200&q=80';

function isValidStoryType(value: unknown): value is StoryType {
    return typeof value === 'string' && (STORY_FORMATS as readonly string[]).includes(value);
}

function isValidStoryRole(value: unknown): value is StoryRole {
    return typeof value === 'string' && (STORY_ROLES as readonly string[]).includes(value);
}

function parseStringArray(raw: unknown): string[] {
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
}

/** `public_impact_stories.timeline` is JSONB — never trust its shape. */
function parseTimeline(raw: unknown): StoryTimelineEvent[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];
        const e = entry as Record<string, unknown>;
        const year = typeof e.year === 'string' ? e.year : '';
        const title = typeof e.title === 'string' ? e.title : '';
        const description = typeof e.description === 'string' ? e.description : '';
        if (!year && !title) return [];
        return [{ year, title, description }];
    });
}

function parseStats(raw: unknown): Array<{ label: string; value: string }> {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return [];
        const e = entry as Record<string, unknown>;
        const label = typeof e.label === 'string' ? e.label : '';
        const value = typeof e.value === 'string' ? e.value : '';
        if (!label || !value) return [];
        return [{ label, value }];
    });
}

/** Rough reading time (200 wpm) so editors never have to set it manually. */
function estimateReadMinutes(html: string): number {
    const words = html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

export function toNewsViewModel(article: PublicNewsArticle): NewsViewModel {
    return {
        id: article.id,
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt ?? '',
        publishedAt: article.published_at ?? article.created_at,
        imageSrc: article.cover_image_url || FALLBACK_NEWS_IMAGE,
        category: article.category ?? 'general',
        author: article.author_name ? { name: article.author_name } : undefined,
    };
}

export function toArticleDeepDiveViewModel(
    article: PublicNewsArticle,
    relatedArticles: NewsViewModel[] = [],
): ArticleDeepDiveViewModel {
    return {
        ...toNewsViewModel(article),
        // Sanitized: CMS HTML reaches the DOM through dangerouslySetInnerHTML.
        content: sanitizeRichHtml(article.content),
        tags: parseStringArray(article.tags),
        readTimeMinutes: article.read_minutes ?? estimateReadMinutes(article.content),
        keyTakeaways: parseStringArray(article.key_takeaways),
        relatedArticles,
        author: {
            name: article.author_name ?? 'AWE Team',
            avatar: article.author_avatar_url ?? undefined,
            role: article.author_role ?? undefined,
        },
    };
}

// ---------------------------------------------------------------------------
// Impact stories
// ---------------------------------------------------------------------------

export function toStoryViewModel(story: PublicImpactStory): StoryViewModel {
    const stats = parseStats(story.impact_stats);
    return {
        id: story.id,
        slug: story.slug,
        title: story.title,
        summary: story.summary ?? '',
        type: isValidStoryType(story.story_type) ? story.story_type : 'article',
        program: story.program ?? 'general',
        role: isValidStoryRole(story.role) ? story.role : 'beneficiary',
        author: story.author_name
            ? { name: story.author_name, avatar: story.author_avatar_url ?? undefined }
            : { name: 'AWE Team' },
        publishedAt: story.published_at ?? story.created_at,
        imageSrc: story.image_url || FALLBACK_STORY_IMAGE,
        duration: story.duration_label ?? undefined,
        isFeatured: story.is_featured,
        impactMetric: stats[0],
    };
}

export function toStoryDeepDiveViewModel(
    story: PublicImpactStory,
    relatedStories: StoryViewModel[] = [],
): StoryDeepDiveViewModel {
    return {
        ...toStoryViewModel(story),
        content: sanitizeRichHtml(story.content),
        mediaUrl: story.media_url ?? undefined,
        transcriptUrl: story.transcript_url ?? undefined,
        timeline: parseTimeline(story.timeline),
        impactStats: parseStats(story.impact_stats),
        relatedStories,
    };
}

// ---------------------------------------------------------------------------
// Volunteer roles
// ---------------------------------------------------------------------------

const WORK_TYPE_LABELS: Record<string, VolunteerRole['type']> = {
    remote: 'Remote',
    onsite: 'On-Site',
    hybrid: 'Hybrid',
};

export function toVolunteerRole(role: PublicVolunteerRole): VolunteerRole {
    return {
        id: role.id,
        title: role.title,
        location: role.location || 'Remote',
        type: WORK_TYPE_LABELS[role.work_type] ?? 'On-Site',
        category: role.category ?? 'General',
        commitment: role.commitment || 'Flexible',
        isUrgent: role.is_urgent,
        description: role.description ?? '',
    };
}
