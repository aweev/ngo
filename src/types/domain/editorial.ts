/**
 * Editorial content: news articles, impact stories and volunteer roles.
 *
 * These three entities live in their own tables (migration 25) rather than in
 * `content_pages`, because they are list-shaped, filterable and slug-routed —
 * a page-per-row model with JSON `content` would force every filter into
 * application code.
 *
 * Public reads never touch these types directly: they go through the
 * `public_*` views and the `Public*` shapes in `@/actions/public`.
 */

export type EditorialStatus = 'draft' | 'published' | 'archived';
export type VolunteerRoleStatus = 'draft' | 'open' | 'closed';

// ---------------------------------------------------------------------------
// News articles
// ---------------------------------------------------------------------------

export interface NewsArticle {
  id: string;
  organization_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_alt_text: string | null;
  category: string | null;
  author_name: string | null;
  author_role: string | null;
  read_minutes: number | null;
  tags: string[];
  key_takeaways: string[];
  status: EditorialStatus;
  is_featured: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsArticleInsert {
  organization_id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string;
  cover_image_url?: string | null;
  cover_alt_text?: string | null;
  category?: string | null;
  author_name?: string | null;
  author_role?: string | null;
  read_minutes?: number | null;
  tags?: string[];
  key_takeaways?: string[];
  status?: EditorialStatus;
  is_featured?: boolean;
  published_at?: string | null;
  created_by?: string | null;
}

export interface NewsArticleUpdate extends Partial<Omit<NewsArticleInsert, 'organization_id'>> {
  updated_at?: string;
}

// ---------------------------------------------------------------------------
// Impact stories
// ---------------------------------------------------------------------------

export type StoryTypeValue = 'article' | 'video' | 'audio' | 'photo';
export type StoryRoleValue = 'beneficiary' | 'volunteer' | 'partner' | 'donor';

export interface StoryTimelineEntry {
  year: string;
  title: string;
  description: string;
}

export interface StoryImpactStat {
  label: string;
  value: string;
}

export interface ImpactStory {
  id: string;
  organization_id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  story_type: StoryTypeValue;
  program: string | null;
  subject_role: StoryRoleValue;
  author_name: string | null;
  author_avatar_url: string | null;
  image_url: string | null;
  image_alt: string | null;
  media_url: string | null;
  transcript_url: string | null;
  duration_label: string | null;
  timeline: StoryTimelineEntry[];
  impact_stats: StoryImpactStat[];
  consent_obtained: boolean;
  status: EditorialStatus;
  is_featured: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImpactStoryInsert {
  organization_id: string;
  title: string;
  slug: string;
  summary?: string | null;
  content?: string;
  story_type?: StoryTypeValue;
  program?: string | null;
  subject_role?: StoryRoleValue;
  author_name?: string | null;
  author_avatar_url?: string | null;
  image_url?: string | null;
  image_alt?: string | null;
  media_url?: string | null;
  transcript_url?: string | null;
  duration_label?: string | null;
  timeline?: StoryTimelineEntry[];
  impact_stats?: StoryImpactStat[];
  consent_obtained?: boolean;
  status?: EditorialStatus;
  is_featured?: boolean;
  published_at?: string | null;
  created_by?: string | null;
}

export interface ImpactStoryUpdate extends Partial<Omit<ImpactStoryInsert, 'organization_id'>> {
  updated_at?: string;
}

// ---------------------------------------------------------------------------
// Volunteer roles
// ---------------------------------------------------------------------------

export type WorkType = 'onsite' | 'remote' | 'hybrid';

export interface VolunteerRole {
  id: string;
  organization_id: string;
  title: string;
  slug: string;
  description: string | null;
  location: string;
  work_type: WorkType;
  category: string | null;
  commitment: string;
  responsibilities: string[];
  requirements: string[];
  openings: number;
  is_urgent: boolean;
  status: VolunteerRoleStatus;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VolunteerRoleInsert {
  organization_id: string;
  title: string;
  slug: string;
  description?: string | null;
  location?: string;
  work_type?: WorkType;
  category?: string | null;
  commitment?: string;
  responsibilities?: string[];
  requirements?: string[];
  openings?: number;
  is_urgent?: boolean;
  status?: VolunteerRoleStatus;
  published_at?: string | null;
  created_by?: string | null;
}

export interface VolunteerRoleUpdate extends Partial<Omit<VolunteerRoleInsert, 'organization_id'>> {
  updated_at?: string;
}

/** Editorial taxonomy shared by the admin filters and the public forms. */
export const STORY_TYPE_VALUES: readonly StoryTypeValue[] = ['article', 'video', 'audio', 'photo'];
export const STORY_ROLE_VALUES: readonly StoryRoleValue[] = ['beneficiary', 'volunteer', 'partner', 'donor'];
export const WORK_TYPE_VALUES: readonly WorkType[] = ['onsite', 'remote', 'hybrid'];
export const NEWS_CATEGORIES = [
  'program-update',
  'thought-leadership',
  'press',
  'report',
  'announcement',
] as const;
