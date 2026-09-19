import type { Metadata } from 'next';
import { getMessages, getTranslations } from 'next-intl/server';
import { HeroSection } from '@/components/landing/hero-section';
import { ImpactSection } from '@/components/landing/impact-section';
import { MissionSection } from '@/components/landing/mission-section';
import { ProgramPillars } from '@/components/landing/program-pillars';
import { SuccessStoriesCarousel } from '@/components/landing/success-stories-carousel';
import {
    HeroViewModel,
    TestimonialViewModel,
    ImpactMetricViewModel,
    MissionViewModel,
    SuccessStoryViewModel,
    InvolvementOption,
    NewsViewModel,
    PartnerViewModel
} from '@/types/domain-adapters';
import { GetInvolvedSection } from '@/components/landing/get-involved-section';
import { RecentNewsSection } from '@/components/landing/recent-news-section';
import { TrustMarquee } from '@/components/landing/trust-marquee';
import { NewsletterSection } from '@/components/landing/newsletter-section';
import { Link } from '@/lib/navigation';
import { EventCard } from '@/components/events/event-card';
import { formatPublicCompact, formatPublicNumber } from '@/lib/i18n/format';
import {
    getPublicCampaigns,
    getPublicProjects,
    getPublicStats,
    getPublicContentPage,
    getPublicNews,
    getPublicStories,
    getPublicTestimonials,
    getPublicImpactMetrics,
    getPublicEvents,
    type PublicContentPage,
} from '@/actions/public';
import { buildPublicMetadata } from '@/lib/seo';

export const revalidate = 300;

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Hero' });
    return buildPublicMetadata({
        locale,
        path: '/public',
        title: t('default_headline'),
        description: t('default_subhead'),
    });
}

type Props = {
    params: Promise<{ locale: string }>;
};

type AbstractIntlMessages = {
    [key: string]: string | AbstractIntlMessages;
};

// 1. Safe Traversal Function
function getMessage(messages: AbstractIntlMessages, path: string): string {
    const keys = path.split('.');
    let current: string | AbstractIntlMessages = messages;

    for (const k of keys) {
        if (typeof current === 'object' && current !== null && k in current) {
            current = current[k];
        } else {
            return path;
        }
    }
    return typeof current === 'string' ? current : path;
}

function contentStr(page: PublicContentPage | null, ...keys: string[]): string | undefined {
    if (!page) return undefined;
    const c = (page.content ?? {}) as Record<string, unknown>;
    for (const key of keys) {
        const v = c[key];
        if (typeof v === 'string' && v.trim().length > 0) return v;
    }
    return undefined;
}

// --- Admin-driven mappers (admin command center = single source of truth) ---

function buildHero(
    heroPage: PublicContentPage | null,
    campaigns: { name: string; slug: string; description: string | null; cover_image_url: string | null }[],
    t: (key: string) => string
): HeroViewModel {
    // 1) Explicit homepage hero managed in /admin/content (slug: homepage-hero)
    if (heroPage) {
        return {
            headlinePrimary: contentStr(heroPage, 'headline_primary', 'headlinePrimary') ?? heroPage.title ?? t('Hero.default_headline'),
            headlineAccent: contentStr(heroPage, 'headline_accent', 'headlineAccent') ?? t('Hero.default_accent'),
            subheadline: contentStr(heroPage, 'subheadline', 'subtitle') ?? heroPage.meta_description ?? t('Hero.default_subhead'),
            primaryCta: contentStr(heroPage, 'primary_cta', 'primaryCta') ?? t('Hero.cta_primary'),
            primaryCtaLink: contentStr(heroPage, 'primary_cta_link', 'primaryCtaLink') ?? '/public/get-involved/donate',
            secondaryCta: contentStr(heroPage, 'secondary_cta', 'secondaryCta') ?? t('Hero.cta_secondary'),
            trustText1: contentStr(heroPage, 'trust_1', 'trustText1') ?? t('Hero.trust_1'),
            trustText2: contentStr(heroPage, 'trust_2', 'trustText2') ?? t('Hero.trust_2'),
            scrollText: contentStr(heroPage, 'scroll_text', 'scrollText') ?? t('Hero.scroll'),
            imageAlt: heroPage.title || t('Common.image_placeholder'),
            imageSrc: contentStr(heroPage, 'image_src', 'imageSrc') ?? heroPage.cover_image_url ?? undefined,
        };
    }

    // 2) Fallback: latest active campaign from /admin/campaigns
    const active = campaigns[0];
    if (active) {
        const parts = (active.name ?? '').split(':');
        return {
            headlinePrimary: (parts[0]?.trim() || t('Hero.default_headline')),
            headlineAccent: (parts[1]?.trim() || t('Hero.default_accent')),
            subheadline: active.description || t('Hero.default_subhead'),
            primaryCta: t('Hero.cta_primary'),
            primaryCtaLink: '/public/get-involved/donate',
            secondaryCta: t('Hero.cta_secondary'),
            trustText1: t('Hero.trust_1'),
            trustText2: t('Hero.trust_2'),
            scrollText: t('Hero.scroll'),
            imageAlt: active.name || t('Common.image_placeholder'),
            imageSrc: active.cover_image_url ?? undefined,
        };
    }

    // 3) Empty state: i18n copy only, no fake imagery claims
    return {
        headlinePrimary: t('Hero.default_headline'),
        headlineAccent: t('Hero.default_accent'),
        subheadline: t('Hero.default_subhead'),
        primaryCta: t('Hero.cta_primary'),
        primaryCtaLink: '/public/get-involved/donate',
        secondaryCta: t('Hero.cta_secondary'),
        trustText1: t('Hero.trust_1'),
        trustText2: t('Hero.trust_2'),
        scrollText: t('Hero.scroll'),
        imageAlt: t('Common.image_placeholder'),
        imageSrc: undefined,
    };
}

function mapTestimonials(pages: PublicContentPage[]): TestimonialViewModel[] {
    return pages.map((p) => {
        const c = (p.content ?? {}) as Record<string, unknown>;
        const text = (typeof c.quote === 'string' && c.quote) || (typeof c.text === 'string' && c.text) || p.meta_description || '';
        const author = (typeof c.author === 'string' && c.author) || (typeof c.name === 'string' && c.name) || p.title;
        const location = (typeof c.location === 'string' && c.location) || (typeof c.role === 'string' && c.role) || '';
        return { text, author, location };
    }).filter((x) => x.text.trim().length > 0);
}

function mapStories(pages: PublicContentPage[]): SuccessStoryViewModel[] {
    return pages.map((p) => {
        const c = (p.content ?? {}) as Record<string, unknown>;
        const s = (k: string) => (typeof c[k] === 'string' ? (c[k] as string) : undefined);
        return {
            id: p.id,
            slug: p.slug,
            name: s('name') ?? p.title,
            role: s('role') ?? s('author_role') ?? '',
            location: s('location') ?? '',
            quote: s('quote') ?? s('excerpt') ?? p.meta_description ?? '',
            imageSrc: s('image_src') ?? s('imageSrc') ?? p.cover_image_url ?? '',
            videoUrl: s('video_url') ?? s('videoUrl'),
            impactTag: s('impact_tag') ?? s('impactTag') ?? s('category_label'),
        } satisfies SuccessStoryViewModel;
    }).filter((x) => x.name.trim().length > 0 && x.quote.trim().length > 0 && x.imageSrc.trim().length > 0);
}

function mapNews(pages: PublicContentPage[]): NewsViewModel[] {
    return pages.map((p) => {
        const c = (p.content ?? {}) as Record<string, unknown>;
        const s = (k: string) => (typeof c[k] === 'string' ? (c[k] as string) : undefined);
        return {
            id: p.id,
            slug: p.slug,
            title: p.title,
            excerpt: s('excerpt') ?? p.meta_description ?? '',
            publishedAt: p.published_at ?? p.created_at,
            imageSrc: s('image_src') ?? s('imageSrc') ?? p.cover_image_url ?? '',
            category: s('category_label') ?? s('category') ?? 'News',
            author: { name: s('author_name') ?? s('author') ?? 'AWE' },
        } satisfies NewsViewModel;
    }).filter((x) => x.title.trim().length > 0 && x.imageSrc.trim().length > 0);
}

function buildMission(missionPage: PublicContentPage | null, t: (key: string) => string): MissionViewModel {
    const fallbackValues = [
        { icon: 'Zap', title: t('Mission.values.economic'), description: t('Mission.values.economic_desc') },
        { icon: 'Users', title: t('Mission.values.social'), description: t('Mission.values.social_desc') },
        { icon: 'Heart', title: t('Mission.values.health'), description: t('Mission.values.health_desc') },
    ];
    if (!missionPage) {
        return {
            preheadline: t('Mission.preheadline'),
            headline: t('Mission.headline'),
            description: t('Mission.description'),
            imageSrc: '',
            statsStrip: [],
            values: fallbackValues,
        };
    }
    const c = (missionPage.content ?? {}) as Record<string, unknown>;
    const rawValues = Array.isArray(c.values) ? (c.values as Record<string, unknown>[]) : [];
    const values = rawValues.length > 0
        ? rawValues.map((v, i) => ({
            icon: typeof v.icon === 'string' ? v.icon : (fallbackValues[i % fallbackValues.length]?.icon ?? 'Heart'),
            title: typeof v.title === 'string' ? v.title : '',
            description: typeof v.description === 'string' ? v.description : '',
        })).filter((v) => v.title.trim().length > 0)
        : fallbackValues;
    return {
        preheadline: contentStr(missionPage, 'preheadline') ?? t('Mission.preheadline'),
        headline: contentStr(missionPage, 'headline') ?? missionPage.title ?? t('Mission.headline'),
        description: contentStr(missionPage, 'description') ?? missionPage.meta_description ?? t('Mission.description'),
        imageSrc: contentStr(missionPage, 'image_src', 'imageSrc') ?? missionPage.cover_image_url ?? '',
        statsStrip: [],
        values,
    };
}

function buildInvolved(
    involvedPage: PublicContentPage | null,
    t: (key: string) => string
): InvolvementOption[] {
    const c = ((involvedPage?.content ?? {}) as Record<string, unknown>);
    const section = (key: string, fallback: InvolvementOption): InvolvementOption => {
        const raw = c[key] as Record<string, unknown> | undefined;
        if (!raw || typeof raw !== 'object') return fallback;
        return {
            title: typeof raw.title === 'string' && raw.title ? raw.title : fallback.title,
            description: typeof raw.description === 'string' && raw.description ? raw.description : fallback.description,
            cta: typeof raw.cta === 'string' && raw.cta ? raw.cta : fallback.cta,
            link: typeof raw.link === 'string' && raw.link ? raw.link : fallback.link,
            icon: fallback.icon,
        };
    };
    return [
        section('donor', {
            title: t('Involved.donor.title'),
            description: t('Involved.donor.desc'),
            cta: t('Involved.donor.cta'),
            link: '/public/get-involved/donate',
            icon: 'heart',
        }),
        section('volunteer', {
            title: t('Involved.volunteer.title'),
            description: t('Involved.volunteer.desc'),
            cta: t('Involved.volunteer.cta'),
            link: '/public/get-involved/volunteer',
            icon: 'users',
        }),
        section('partner', {
            title: t('Involved.partner.title'),
            description: t('Involved.partner.desc'),
            cta: t('Involved.partner.cta'),
            link: '/public/get-involved/corporate',
            icon: 'briefcase',
        }),
    ];
}

function buildImpactMetrics(
    impactMetrics: { name: string; description: string | null; unit: string; category: string | null; current_value: number }[],
    stats: { totalDonations: number; totalAmount: number; activeProjects: number; activeCampaigns: number; totalVolunteers: number; totalBeneficiaries: number; upcomingEvents: number },
    t: (key: string) => string,
    locale: string
): ImpactMetricViewModel[] | null {
    // 1) Admin-defined public KPIs from /admin/impact — the preferred source.
    // Numbers stay numeric; only the display formatting is locale-aware.
    if (impactMetrics.length > 0) {
        return impactMetrics.slice(0, 6).map((m) => ({
            label: m.name,
            value: `${formatPublicNumber(Number(m.current_value), locale)} ${m.unit}`.trim(),
            iconKey: (m.category ?? 'default').toLowerCase(),
            description: m.description ?? undefined,
        }));
    }

    // 2) Live aggregate stats (donations / projects / campaigns / volunteers / beneficiaries)
    const hasAny = stats.totalDonations > 0 || stats.activeProjects > 0 || stats.activeCampaigns > 0 || stats.totalVolunteers > 0 || stats.totalBeneficiaries > 0;
    if (!hasAny) return null;

    const metrics: ImpactMetricViewModel[] = [];
    if (stats.totalBeneficiaries > 0) {
        metrics.push({
            label: t('Impact.Stats.stats_lives'),
            value: formatPublicCompact(stats.totalBeneficiaries, locale),
            iconKey: 'lives',
            description: t('Fallback.Metrics.lives_desc'),
        });
    }
    if (stats.activeProjects > 0) {
        metrics.push({
            label: t('Impact.Stats.stats_projects'),
            value: formatPublicNumber(stats.activeProjects, locale),
            iconKey: 'projects',
            description: t('Fallback.Metrics.projects_desc'),
        });
    }
    if (stats.totalVolunteers > 0) {
        metrics.push({
            label: t('Impact.Stats.stats_volunteers'),
            value: formatPublicCompact(stats.totalVolunteers, locale),
            iconKey: 'volunteers',
            description: t('Fallback.Metrics.volunteers_desc'),
        });
    }
    if (metrics.length === 0) {
        metrics.push(
            {
                label: t('Impact.Stats.stats_lives'),
                value: formatPublicCompact(stats.totalDonations, locale),
                iconKey: 'lives',
                description: t('Fallback.Metrics.lives_desc'),
            },
            {
                label: t('Impact.Stats.stats_projects'),
                value: formatPublicNumber(stats.activeProjects, locale),
                iconKey: 'projects',
                description: t('Fallback.Metrics.projects_desc'),
            },
            {
                label: t('Impact.Stats.stats_countries'),
                value: formatPublicNumber(stats.activeCampaigns, locale),
                iconKey: 'countries',
                description: t('Fallback.Metrics.countries_desc'),
            },
        );
    }
    return metrics;
}

async function getPartners(t: (key: string) => string, locale: string): Promise<PartnerViewModel[]> {
    void t;
    try {
        const { getPublicPartners } = await import('@/actions/public');
        const { data: partners } = await getPublicPartners(locale);

        if (partners && partners.length > 0) {
            return partners.map(partner => ({
                id: partner.id,
                name: partner.name,
                logoSrc: partner.logo_url || undefined,
                type: (partner.type === 'corporate' ? 'Corporate' : partner.type === 'government' ? 'Funder' : 'Badge') as 'Funder' | 'Corporate' | 'Badge',
                website: partner.website || undefined
            }));
        }
    } catch { }

    // Real data only — no fake partner logos.
    return [];
}

export default async function HomePage({ params }: Props) {
    const { locale } = await params;

    const messages = await getMessages({ locale }) as AbstractIntlMessages;
    const t = (key: string) => getMessage(messages, key);

    const [
        heroPageRes,
        missionPageRes,
        involvedPageRes,
        campaignsRes,
        projectsRes,
        impactMetricsRes,
        stats,
        testimonialPagesRes,
        storyPagesRes,
        newsPagesRes,
        eventsRes,
        partners,
    ] = await Promise.all([
        getPublicContentPage('homepage-hero', locale),
        getPublicContentPage('homepage-mission', locale),
        getPublicContentPage('homepage-get-involved', locale),
        getPublicCampaigns(locale),
        getPublicProjects(locale),
        getPublicImpactMetrics(locale),
        getPublicStats(),
        getPublicTestimonials(5, locale),
        getPublicStories(5, locale),
        getPublicNews(3, locale),
        getPublicEvents(3, locale),
        getPartners(t, locale),
    ]);

    const heroPage = heroPageRes.data;
    const missionPage = missionPageRes.data;
    const involvedPage = involvedPageRes.data;
    const campaigns = campaignsRes.data ?? [];
    const projects = projectsRes.data ?? [];
    const impactMetrics = impactMetricsRes.data ?? [];
    const testimonialPages = testimonialPagesRes.data ?? [];
    const storyPages = storyPagesRes.data ?? [];
    const newsPages = newsPagesRes.data ?? [];
    const events = eventsRes.data ?? [];

    const heroContent = buildHero(heroPage, campaigns, t);
    const testimonials = mapTestimonials(testimonialPages);
    const metrics = buildImpactMetrics(impactMetrics, stats, t, locale);
    const stories = mapStories(storyPages);
    const news = mapNews(newsPages);
    const missionContent = buildMission(missionPage, t);
    const involvedOptions = buildInvolved(involvedPage, t);

    // Live per-category project counts for the pillars (/admin/projects)
    const projectCounts: Record<string, number> = {};
    for (const p of projects) {
        const cat = (p.category ?? '').toLowerCase();
        if (!cat) continue;
        // Match pillar ids: economic / education / health / social
        const key = cat.includes('econ') ? 'economic'
            : cat.includes('educ') ? 'education'
            : cat.includes('health') ? 'health'
            : cat.includes('social') ? 'social'
            : cat;
        projectCounts[key] = (projectCounts[key] ?? 0) + 1;
    }

    const heroMetrics: [ImpactMetricViewModel, ImpactMetricViewModel, ImpactMetricViewModel] = (metrics && metrics.length >= 3
        ? [metrics[0], metrics[1], metrics[2]]
        : metrics && metrics.length > 0
            ? [
                metrics[0],
                metrics[1] ?? { label: t('Impact.Stats.stats_projects'), value: formatPublicNumber(stats.activeProjects, locale), iconKey: 'projects' },
                metrics[2] ?? { label: t('Impact.Stats.stats_countries'), value: formatPublicNumber(stats.activeCampaigns, locale), iconKey: 'countries' },
            ]
            : [
                { label: t('Impact.Stats.stats_lives'), value: stats.totalBeneficiaries > 0 ? formatPublicCompact(stats.totalBeneficiaries, locale) : formatPublicNumber(0, locale), iconKey: 'lives' },
                { label: t('Impact.Stats.stats_projects'), value: formatPublicNumber(stats.activeProjects, locale), iconKey: 'projects' },
                { label: t('Impact.Stats.stats_countries'), value: formatPublicNumber(stats.activeCampaigns, locale), iconKey: 'countries' },
            ]) as [ImpactMetricViewModel, ImpactMetricViewModel, ImpactMetricViewModel];

    return (
        <div className="flex flex-col w-full overflow-x-hidden">
            {/* 1. HERO — admin: content `homepage-hero` → campaigns */}
            <HeroSection
                content={heroContent}
                testimonials={testimonials}
                metrics={heroMetrics}
                locale={locale}
            />

            {/* 2. TRUST MARQUEE — admin: /admin/partners (hidden when empty) */}
            {partners.length > 0 && <TrustMarquee partners={partners} />}

            {/* 3. PROGRAMS — admin: /admin/projects (live counts per pillar) */}
            <ProgramPillars projectCounts={projectCounts} totalProjects={projects.length} />

            {/* 4. MISSION — admin: content `homepage-mission` */}
            <MissionSection content={missionContent} />

            {/* 5. STORIES — admin: content category `story` (hidden when empty) */}
            {stories.length > 0 && <SuccessStoriesCarousel stories={stories} />}

            {/* 6. IMPACT — admin: /admin/impact `is_public` → aggregate stats (hidden when empty) */}
            {metrics && metrics.length > 0 && (
                <div id="impact-section">
                    <ImpactSection stats={metrics} locale={locale} />
                </div>
            )}

            {/* 7. UPCOMING EVENTS — admin: /admin/events (hidden when empty) */}
            {events.length > 0 && (
                <section className="py-16 bg-muted/20 border-y border-border/50">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="flex items-end justify-between gap-6 mb-8">
                            <div>
                                <span className="text-primary font-bold tracking-widest uppercase text-sm pl-4 border-l-2 border-primary mb-3 block">
                                    {t('Events.badge')}
                                </span>
                                <h2 className="text-3xl md:text-4xl font-serif font-bold">{t('Events.title')}</h2>
                            </div>
                            <Link href="/public/events" className="text-sm font-semibold text-primary hover:underline shrink-0">
                                {t('Events.view_all')}
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {events.map((e) => (
                                <EventCard key={e.id} event={e} locale={locale} />
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* 8. GET INVOLVED — admin: content `homepage-get-involved` */}
            <GetInvolvedSection options={involvedOptions} title={contentStr(involvedPage, 'title') ?? t('Involved.title')} />

            {/* 9. NEWS — admin: content category `news` (hidden when empty) */}
            {news.length > 0 && (
                <RecentNewsSection
                    news={news}
                    title={t('News.title')}
                    subtitle={t('News.subtitle')}
                    cta={t('News.view_all')}
                    locale={locale}
                />
            )}

            {/* 10. NEWSLETTER — writes to admin: form_submissions / newsletter_subscribers */}
            <NewsletterSection
                title={t('Newsletter.title')}
                subtitle={t('Newsletter.subtitle')}
                locale={locale}
            />
        </div>
    );
}
