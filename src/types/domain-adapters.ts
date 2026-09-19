// --- CMS / UI View Models ---
//
// Self-contained: no dependency on the legacy Go-API/OpenAPI types
// (`src/types/api/*` was removed with the Supabase migration).

/** Generic CMS entry shape used to map stored content into view models. */
export interface ContentEntry {
    id: string;
    slug?: string;
    title?: string;
    fields?: Record<string, unknown>;
    content?: Record<string, unknown>;
    /** Publication timestamp (present on Supabase-backed content rows). */
    published_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

// 1. Hero & Landing
export interface HeroViewModel {
    headlinePrimary: string;
    headlineAccent: string;
    subheadline: string;
    primaryCta: string;
    primaryCtaLink: string;
    secondaryCta: string;
    trustText1: string;
    trustText2: string;
    scrollText: string;
    imageAlt: string;
    imageSrc?: string;
}

export interface TestimonialViewModel {
    text: string;
    author: string;
    location: string;
}

export interface ImpactMetricViewModel {
    label: string;
    value: string;
    description?: string;
    iconKey?: string;
}

export interface ValueItemViewModel {
    icon: string;
    title: string;
    description: string;
}

export interface MissionViewModel {
    preheadline: string;
    headline: string;
    description: string;
    values: ValueItemViewModel[];
    imageSrc: string;
    statsStrip: string[];
}


// 2. Success Stories (Landing Page Carousel)
export interface SuccessStoryViewModel {
    id: string;
    slug: string;
    name: string;
    role: string;       // e.g. "Alumni, Class of 2024"
    quote: string;      // The main impact statement
    location: string;
    imageSrc: string;   // Portrait
    videoUrl?: string;  // If present, show Play icon
    impactTag?: string; // e.g. "Economic Empowerment"
}


// 3. Involvement
export interface InvolvementOption {
    title: string;
    description: string;
    cta: string;
    link: string;
    icon: "heart" | "users" | "briefcase" | string; // Map to Lucide icons
}


// 4. News & Articles
export interface NewsViewModel {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    publishedAt: string; // ISO String
    imageSrc: string;
    category: string;
    author?: {
        name: string;
        avatar?: string;
    };
}

export interface ArticleDeepDiveViewModel extends NewsViewModel {
    content: string; // HTML string from TipTap/Editor
    tags: string[];
    readTimeMinutes: number;
    keyTakeaways?: string[]; // Optional summary points
    relatedArticles: NewsViewModel[];
    author: {
        name: string;
        avatar?: string;
        role?: string;
        bio?: string;
    };
}


// 5. Partners
export interface PartnerViewModel {
    id: string;
    name: string;
    logoSrc?: string; // Used in Marquee (absent → typographic fallback)
    logo?: string;   // Used in PartnerGrid (Alias for logoSrc)
    type: "Funder" | "Corporate" | "Badge";
    website?: string;
}


// 6. Team & Board
export interface TeamMemberViewModel {
    id: string;
    name: string;
    role: string; // "Executive Director", "Chair", etc.
    category: 'Leadership' | 'Board' | 'Staff' | 'Advisory';
    imageSrc: string;
    bio: string;
    affiliation?: string; // Specific to Board members
    linkedin?: string;
    department?: string;  // Specific to Staff (e.g., "operations", "programs")
}


// 7. Financials
export interface FinancialSummary {
    year: number;
    totalRevenue: number;
    totalBudget: number;
    efficiencyRatio: number; // 0.85
    expenses: {
        program: number;
        management: number;
        fundraising: number;
    };
}

export interface FinancialDocument {
    id: string;
    title: string;
    year: number;
    category: "Report" | "Audit" | "Legal";
    url: string;
    size: string; // e.g. "2.4 MB"
}


// 8. Projects & Programs
export interface ProjectViewModel {
    id: string;
    title: string;
    slug: string;
    summary: string;
    imageSrc: string;
    status: "Active" | "Recruiting" | "Completed" | "Planning";
    location: string;
}

export interface ProjectDeepDiveViewModel {
    id: string;
    slug: string;
    title: string;
    category: string;
    summary: string;
    description: string; // HTML or Markdown
    status: "Planning" | "Recruiting" | "Active" | "Completed";
    location: string;
    startDate: string;
    endDate: string;
    applicationDeadline?: string;
    imageSrc: string;
    lead: {
        name: string;
        role: string;
        avatar: string;
    };
    funding?: {
        current: number;
        goal: number;
        currency: string;
    };
    volunteerNeeds?: number;
    updates: Array<{
        id: string;
        date: string;
        title: string;
        imageSrc: string;
        description: string;
    }>;
}

// Raw API shape (from Go Backend)
export interface ApiProject {
    id: string;
    name: string;
    description: string;
    status: string; // "IN_PROGRESS", "PLANNING", etc.
    properties?: {
        location?: string;
        image_url?: string;
        category?: string;
    };
}

export interface ApiProjectDetails {
    id: string;
    name: string;
    description: string;
    status: "PLANNING" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "CANCELLED";
    start_date?: string;
    end_date?: string;
    tasks?: Array<{ id: string; title: string }>;
    members?: Array<{ user_id: string; role: string }>;
    milestones?: Array<{ id: string; title: string; is_critical: boolean }>;
    files?: Array<{ url: string; file_type: string }>;
    properties?: {
        location?: string;
        image_url?: string;
        category?: string;
        lead_id?: string;
    };
}


// 9. Stories (Full Hub & Detail)
export type StoryType = 'video' | 'audio' | 'article' | 'photo';
export type StoryRole = 'beneficiary' | 'volunteer' | 'partner' | 'donor';

// Constants for Filter UI
export const STORY_FORMATS = ['video', 'audio', 'article', 'photo'] as const;
export const STORY_ROLES = ['beneficiary', 'volunteer', 'partner', 'donor'] as const;

export interface StoryViewModel {
    id: string;
    slug: string;
    title: string;
    summary: string;
    type: StoryType;
    program: string;
    role: StoryRole;
    author: {
        name: string;
        avatar?: string;
    };
    publishedAt: string;
    imageSrc: string;
    duration?: string;
    isFeatured?: boolean;
    impactMetric?: {
        label: string;
        value: string;
    };
}

export interface StoryTimelineEvent {
    year: string;
    title: string;
    description: string;
}

export interface StoryDeepDiveViewModel extends StoryViewModel {
    content: string; // HTML Rich Text
    mediaUrl?: string; // High-res video or audio source
    transcriptUrl?: string;
    timeline: StoryTimelineEvent[];
    impactStats?: Array<{
        label: string;
        value: string;
    }>;
    relatedStories: StoryViewModel[];
}


// 10. Volunteering
export interface VolunteerRole {
    id: string;
    title: string;
    location: string;
    type: "Remote" | "On-Site" | "Hybrid";
    category: string; // "Mentorship" | "Events" | "Admin" | "Field Work" | "General"
    commitment: string; // "One-time" | "Recurring" | "Flexible"
    isUrgent: boolean;
    description: string;
}


// 11. Corporate / Case Studies
export interface CaseStudyViewModel {
    id: string;
    companyName: string;
    logoSrc: string;
    quote: string;
    author: string;
    role: string;
    outcomeStats: string;
}