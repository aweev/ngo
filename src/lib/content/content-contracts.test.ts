import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { PublicContentPage } from '@/actions/public';

/**
 * Content contract tests — validate that every CMS-managed page type
 * conforms to its expected schema. These tests serve as the single
 * source of truth for what fields are required/optional on the public site.
 */

// ============================================================
// Base schemas (reusable primitives)
// ============================================================

const SeoSchema = z.object({
    meta_title: z.string().max(200).nullable(),
    meta_description: z.string().max(500).nullable(),
    cover_image_url: z.string().url().nullable(),
});

const BasePageSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(500),
    slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
    content: z.record(z.string(), z.unknown()),
    ...SeoSchema.shape,
    published_at: z.string().datetime({ offset: true }).nullable(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
});

// ============================================================
// 1. Content Page Schemas (by category)
// ============================================================

const HomepageHeroContentSchema = z.object({
    headline_primary: z.string().min(1).max(200),
    headline_accent: z.string().min(1).max(200),
    subheadline: z.string().min(1).max(1000),
    primary_cta: z.string().min(1).max(100),
    primary_cta_link: z.string().min(1).max(500),
    secondary_cta: z.string().min(1).max(100),
    trust_1: z.string().min(1).max(100),
    trust_2: z.string().min(1).max(100),
    scroll_text: z.string().min(1).max(100),
    image_src: z.string().url().optional(),
    image_alt: z.string().min(1).max(200).optional(),
});

const HomepageMissionContentSchema = z.object({
    preheadline: z.string().min(1).max(200),
    headline: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    image_src: z.string().url().optional(),
    values: z.array(z.object({
        icon: z.string().min(1).max(50),
        title: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
    })).min(1).max(6),
});

const HomepageGetInvolvedContentSchema = z.object({
    title: z.string().min(1).max(200),
    donor: z.object({
        title: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
        cta: z.string().min(1).max(50),
        link: z.string().min(1).max(500),
        icon: z.string(),
    }),
    volunteer: z.object({
        title: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
        cta: z.string().min(1).max(50),
        link: z.string().min(1).max(500),
        icon: z.string(),
    }),
    partner: z.object({
        title: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
        cta: z.string().min(1).max(50),
        link: z.string().min(1).max(500),
        icon: z.string(),
    }),
});

const AboutHeroContentSchema = z.object({
    preheader: z.string().min(1).max(200).optional(),
    headline: z.string().min(1).max(200),
    lead: z.string().min(1).max(1000),
    images: z.array(z.string().url()).min(1).optional(),
});

const MissionVisionContentSchema = z.object({
    mission_title: z.string().min(1).max(200),
    mission_text: z.string().min(1).max(2000),
    vision_title: z.string().min(1).max(200),
    vision_text: z.string().min(1).max(2000),
});

const ValuesContentSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    values: z.array(z.object({
        icon: z.string().min(1).max(50).optional(),
        title: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
    })).min(1).max(10),
});

const TheoryContentSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    subtitle: z.string().min(1).max(500).optional(),
    steps: z.array(z.object({
        title: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
    })).min(1).max(8),
});

const TeamMemberContentSchema = z.object({
    name: z.string().min(1).max(200),
    role: z.string().min(1).max(200),
    category: z.enum(['Leadership', 'Board', 'Staff', 'Advisory']),
    bio: z.string().min(1).max(2000).optional(),
    image_src: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    affiliation: z.string().max(200).optional(),
    department: z.string().max(200).optional(),
});

const MilestoneContentSchema = z.object({
    year: z.string().regex(/^\d{4}$/),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(1000),
});

const DocumentContentSchema = z.object({
    year: z.number().int().min(2000).max(2100),
    doc_category: z.enum(['Report', 'Audit', 'Legal']),
    file_url: z.string().url(),
    size: z.string().optional(),
});

const NewsContentSchema = z.object({
    excerpt: z.string().min(1).max(500).optional(),
    image_src: z.string().url().optional(),
    category: z.string().min(1).max(100).optional(),
    author_name: z.string().min(1).max(200).optional(),
});

const StoryContentSchema = z.object({
    name: z.string().min(1).max(200),
    role: z.string().min(1).max(200).optional(),
    location: z.string().min(1).max(200).optional(),
    quote: z.string().min(1).max(2000).optional(),
    image_src: z.string().url().optional(),
    video_url: z.string().url().optional(),
    impact_tag: z.string().min(1).max(100).optional(),
    category: z.string().min(1).max(100).optional(),
});

const TestimonialContentSchema = z.object({
    quote: z.string().min(1).max(2000),
    author: z.string().min(1).max(200),
    location: z.string().min(1).max(200).optional(),
    role: z.string().min(1).max(200).optional(),
});

// ============================================================
// 2. Entity Schemas
// ============================================================

const ImpactMetricContentSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(1).max(1000).optional(),
    unit_label: z.string().min(1).max(50).optional(),
    category: z.string().min(1).max(100).optional(),
});

const EventContentSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000).optional(),
    location: z.string().min(1).max(500).optional(),
    city: z.string().min(1).max(200).optional(),
    country: z.string().min(1).max(200).optional(),
});

const CampaignContentSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(1).max(2000).optional(),
    cta_label: z.string().min(1).max(100).optional(),
    cta_url: z.string().url().optional(),
});

const ProjectContentSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(1).max(2000).optional(),
    location: z.string().min(1).max(500).optional(),
    country: z.string().min(1).max(200).optional(),
    category_label: z.string().min(1).max(100).optional(),
});

const PartnerContentSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(1).max(2000).optional(),
});

const OrganizationContentSchema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().min(1).max(2000).optional(),
    mission: z.string().min(1).max(2000).optional(),
    vision: z.string().min(1).max(2000).optional(),
});

// ============================================================
// Test: Validate public content pages by category
// ============================================================

describe('Content Contract Tests — Public Content Pages', () => {
    const validatePage = (page: PublicContentPage, category: string, schema: z.ZodSchema) => {
        const content = page.content as Record<string, unknown>;
        const result = schema.safeParse(content);
        if (!result.success) {
            console.error(`[${category}] Validation failed for page ${page.slug}:`, result.error.flatten());
        }
        expect(result.success, `Content page "${page.slug}" (${category}) must match schema`).toBe(true);
    };

    const makePage = (partial: Partial<PublicContentPage>): PublicContentPage => ({
        id: '1',
        slug: 'test',
        title: 'Test',
        content: {},
        meta_title: null,
        meta_description: null,
        cover_image_url: null,
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...partial,
    });

    it('homepage-hero content validates', () => {
        // This test documents the expected schema; actual validation
        // happens at runtime via getPublicContentPage
        const mockPage = makePage({
            id: '1',
            slug: 'homepage-hero',
            title: 'Homepage Hero',
            content: {
                headline_primary: 'Test',
                headline_accent: 'Test',
                subheadline: 'Test',
                primary_cta: 'Donate',
                primary_cta_link: '/donate',
                secondary_cta: 'Learn More',
                trust_1: 'Trust 1',
                trust_2: 'Trust 2',
                scroll_text: 'Scroll',
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'homepage-hero', HomepageHeroContentSchema);
    });

    it('homepage-mission content validates', () => {
        const mockPage = makePage({
            id: '2',
            slug: 'homepage-mission',
            title: 'Homepage Mission',
            content: {
                preheadline: 'Why We Exist',
                headline: 'Empowering Communities',
                description: 'We build pathways...',
                values: [
                    { icon: 'Zap', title: 'Economic', description: 'Training...' },
                    { icon: 'Users', title: 'Social', description: 'Bridges...' },
                    { icon: 'Heart', title: 'Health', description: 'Wellbeing...' },
                ],
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'homepage-mission', HomepageMissionContentSchema);
    });

    it('homepage-get-involved content validates', () => {
        const mockPage = makePage({
            id: '3',
            slug: 'homepage-get-involved',
            title: 'Get Involved',
            content: {
                title: 'Choose Your Path',
                donor: { title: 'Support', description: 'Fuel impact', cta: 'Donate', link: '/donate', icon: 'heart' },
                volunteer: { title: 'Volunteer', description: 'Share skills', cta: 'Find Roles', link: '/volunteer', icon: 'users' },
                partner: { title: 'Partner', description: 'CSR', cta: 'Partner', link: '/corporate', icon: 'briefcase' },
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'homepage-get-involved', HomepageGetInvolvedContentSchema);
    });

    it('about-hero content validates', () => {
        const mockPage = makePage({
            id: '4',
            slug: 'about-hero',
            title: 'About Hero',
            content: {
                preheader: 'Our Story',
                headline: 'Founded on belief...',
                lead: 'What started as...',
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'about-hero', AboutHeroContentSchema);
    });

    it('about-mission-vision content validates', () => {
        const mockPage = makePage({
            id: '5',
            slug: 'about-mission-vision',
            title: 'Mission & Vision',
            content: {
                mission_title: 'Our Mission',
                mission_text: 'To provide tools...',
                vision_title: 'Our Vision',
                vision_text: 'A world where...',
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'about-mission-vision', MissionVisionContentSchema);
    });

    it('about-values content validates', () => {
        const mockPage = makePage({
            id: '6',
            slug: 'about-values',
            title: 'Values',
            content: {
                title: 'Values That Guide Us',
                values: [
                    { icon: 'Shield', title: 'Integrity', description: 'Radical transparency...' },
                    { icon: 'Heart', title: 'Empathy', description: 'Listen first...' },
                    { icon: 'ArrowRight', title: 'Agency', description: 'Remove obstacles...' },
                ],
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'about-values', ValuesContentSchema);
    });

    it('about-theory content validates', () => {
        const mockPage = makePage({
            id: '7',
            slug: 'about-theory',
            title: 'Theory of Change',
            content: {
                title: 'Our Theory',
                subtitle: 'How we translate...',
                steps: [
                    { title: 'Inputs', description: 'Donations, time, expertise' },
                    { title: 'Activities', description: 'Workshops, training' },
                    { title: 'Outputs', description: 'Certified skills' },
                    { title: 'Outcomes', description: 'Sustainable jobs' },
                ],
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'about-theory', TheoryContentSchema);
    });

    it('team_member content validates', () => {
        const mockPage = makePage({
            id: '8',
            slug: 'team-member-1',
            title: 'John Doe',
            content: {
                name: 'John Doe',
                role: 'Executive Director',
                category: 'Leadership',
                bio: 'John has 20 years...',
                image_src: 'https://example.com/john.jpg',
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'team_member', TeamMemberContentSchema);
    });

    it('milestone content validates', () => {
        const mockPage = makePage({
            id: '9',
            slug: 'milestone-2020',
            title: 'First Community Center',
            content: {
                year: '2020',
                title: 'First Community Center',
                description: 'Opened our doors...',
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'milestone', MilestoneContentSchema);
    });

    it('document content validates', () => {
        const mockPage = makePage({
            id: '10',
            slug: 'doc-annual-report-2024',
            title: 'Annual Report 2024',
            content: {
                year: 2024,
                doc_category: 'Report',
                file_url: 'https://example.com/report.pdf',
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'document', DocumentContentSchema);
    });

    it('news content validates', () => {
        const mockPage = makePage({
            id: '11',
            slug: 'news-new-center',
            title: 'New Community Center',
            content: {
                excerpt: 'A milestone achievement...',
                image_src: 'https://example.com/news.jpg',
                category: 'Program Update',
                author_name: 'Sarah Jenkins',
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'news', NewsContentSchema);
    });

    it('story content validates', () => {
        const mockPage = makePage({
            id: '12',
            slug: 'story-john-transformed',
            title: 'John Transformed',
            content: {
                name: 'John Doe',
                role: 'Program Alumnus',
                location: 'Kenya',
                quote: 'AWE changed my life...',
                image_src: 'https://example.com/story.jpg',
                impact_tag: 'Education',
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'story', StoryContentSchema);
    });

    it('testimonial content validates', () => {
        const mockPage = makePage({
            id: '13',
            slug: 'testimonial-maria',
            title: 'Maria Santos',
            content: {
                quote: 'AWE transformed our community...',
                author: 'Maria Santos',
                location: 'Kenya',
            },
            published_at: new Date().toISOString(),
        });
        validatePage(mockPage, 'testimonial', TestimonialContentSchema);
    });
});

// ============================================================
// Test: Validate entity translation schemas
// ============================================================

describe('Content Contract Tests — Entity Translations', () => {
    const validateEntity = (entity: Record<string, unknown>, schema: z.ZodSchema, entityType: string) => {
        const result = schema.safeParse(entity);
        if (!result.success) {
            console.error(`[${entityType}] Validation failed:`, result.error.flatten());
        }
        expect(result.success, `${entityType} entity must match schema`).toBe(true);
    };

    it('impact_metric translation validates', () => {
        const mock = { name: 'Lives Touched', description: 'Direct beneficiaries', unit_label: 'people', category: 'impact' };
        validateEntity(mock, ImpactMetricContentSchema, 'impact_metric');
    });

    it('event translation validates', () => {
        const mock = { title: 'Annual Gala', description: 'Join us...', location: 'Berlin', city: 'Berlin', country: 'Germany' };
        validateEntity(mock, EventContentSchema, 'org_event');
    });

    it('campaign translation validates', () => {
        const mock = { name: 'Education Fund', description: 'Support education...', cta_label: 'Donate Now', cta_url: 'https://example.com/donate' };
        validateEntity(mock, CampaignContentSchema, 'campaign');
    });

    it('project translation validates', () => {
        const mock = { name: 'School Build', description: 'Building a school...', location: 'Nairobi', country: 'Kenya', category_label: 'Education' };
        validateEntity(mock, ProjectContentSchema, 'project');
    });

    it('partner translation validates', () => {
        const mock = { name: 'TechCorp', description: 'Major sponsor...' };
        validateEntity(mock, PartnerContentSchema, 'partner');
    });

    it('organization translation validates', () => {
        const mock = { name: 'AWE e.V.', description: 'Empowering communities...', mission: 'To provide tools...', vision: 'A world where...' };
        validateEntity(mock, OrganizationContentSchema, 'organization');
    });
});

// ============================================================
// Test: Validate required fields are never empty
// ============================================================

describe('Content Contract Tests — Required Field Guards', () => {
    it('all public content pages must have a title', () => {
        // The schema should reject empty title
        const schema = BasePageSchema;
        const result = schema.safeParse({
            id: '1', slug: 'test', title: '', content: {}, published_at: new Date().toISOString(),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.title).toBeTruthy();
        }
    });

    it('all public content pages must have a slug', () => {
        const schema = BasePageSchema;
        const result = schema.safeParse({
            id: '1', slug: '', title: 'Test', content: {}, published_at: new Date().toISOString(),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.flatten().fieldErrors.slug).toBeTruthy();
        }
    });

    it('impact metrics must have a name and unit', () => {
        const schema = z.object({
            name: z.string().min(1),
            slug: z.string().min(1),
            unit: z.string().min(1),
        });
        const result = schema.safeParse({ name: '', slug: 'test', unit: '' });
        expect(result.success).toBe(false);
    });

    it('events must have a title and start_date', () => {
        const schema = z.object({
            id: z.string().uuid(),
            title: z.string().min(1),
            slug: z.string().min(1),
            start_date: z.string().datetime(),
        });
        const result = schema.safeParse({ id: '1', title: '', slug: 'test', start_date: '' });
        expect(result.success).toBe(false);
    });
});