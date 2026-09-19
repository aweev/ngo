import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProgramCategory } from "@/lib/program-themes";
import { ImpactMetricViewModel, ProjectViewModel } from "@/types/domain-adapters";
import { getPublicProjectsByCategory } from "@/actions/public";

// Components
import { CategoryHero } from "@/components/programs/category/category-hero";
import { ProblemSolution } from "@/components/programs/category/problem-solution";
import { ImpactSection } from "@/components/landing/impact-section";
import { ProjectsGrid } from "@/components/programs/category/projects-grid";
import { CoordinatorSpotlight } from "@/components/programs/category/coordinator-spotlight";
import { CategoryCTA } from "@/components/programs/category/category-cta";

// Valid Categories matching your translations
const VALID_CATEGORIES: ProgramCategory[] = ["economic-empowerment", "education", "health", "social-integration"];

// --- Data Fetching ---

async function getStats(category: string, locale: string): Promise<ImpactMetricViewModel[]> {
    // Real per-category stats, computed from published projects in the
    // public_projects view. The section hides itself when there is no data —
    // no placeholder numbers anywhere (dev included).
    const { getPublicCategoryStats } = await import("@/actions/public");
    const [result, t] = await Promise.all([
        getPublicCategoryStats(category),
        getTranslations({ locale, namespace: "Impact.Stats" }),
    ]);
    const { data } = result;
    if (!data) return [];

    return [
        {
            label: t("stats_projects"),
            value: String(data.projectCount),
            iconKey: "projects",
        },
        {
            label: t("stats_lives"),
            value: String(data.beneficiariesReached),
            iconKey: "lives",
        },
        {
            label: t("stats_countries"),
            value: String(data.countries),
            iconKey: "countries",
        },
    ];
}

async function getProjects(category: string, locale: string): Promise<ProjectViewModel[]> {
    try {
        // Query Supabase for active projects in this category (localized display strings)
        const { data } = await getPublicProjectsByCategory(category, locale);

        if (data && data.length > 0) {
            return data.map((p) => {
                // Map DB status (lowercase) to Frontend UI strings
                let status: ProjectViewModel['status'] = 'Active';
                if (p.status === 'planning') status = 'Planning';
                if (p.status === 'completed') status = 'Completed';

                return {
                    id: p.id,
                    title: p.name,
                    slug: p.slug || p.id,
                    summary: p.description || "",
                    status: status,
                    location: p.location || "Global",
                    imageSrc: p.cover_image_url || "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800"
                };
            });
        }
    } catch { }

    return [];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string }> }): Promise<Metadata> {
    const { locale, category } = await params;
    if (!VALID_CATEGORIES.includes(category as ProgramCategory)) return {};

    const t = await getTranslations({ locale, namespace: `Programs.Categories.${category}` });
    return {
        title: t("title"),
        description: t("hero_lead")
    };
}

export default async function ProgramCategoryPage({ params }: { params: Promise<{ locale: string; category: string }> }) {
    const { locale, category } = await params;

    // 1. Validation
    if (!VALID_CATEGORIES.includes(category as ProgramCategory)) {
        notFound();
    }

    const t = await getTranslations({ locale, namespace: `Programs.Categories.${category}` });
    const validatedCategory = category as ProgramCategory;

    // 2. Parallel Data Fetching
    const [stats, projects] = await Promise.all([
        getStats(category, locale),
        getProjects(category, locale)
    ]);

    return (
        <main>
            {/* 1. Dynamic Hero */}
            <CategoryHero
                category={validatedCategory}
                title={t("title")}
                lead={t("hero_lead")}
                imageSrc={
                    category === 'education' ? "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=2000" :
                        category === 'health' ? "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000" :
                            category === 'economic-empowerment' ? "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=2000" :
                                "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=2000"
                }
            />

            {/* 2. Problem / Solution */}
            <ProblemSolution
                category={validatedCategory}
                challengeText={t("challenge")}
                solutionText={t("solution")}
            />

            {/* 3. Key Stats (Conditional) */}
            {stats.length > 0 && (
                <div className="bg-muted/10 border-b border-border/50">
                    <ImpactSection stats={stats} locale={locale} />
                </div>
            )}

            {/* 4. Active Projects */}
            <ProjectsGrid
                projects={projects}
                category={validatedCategory}
            />

            {/* 5. Coordinator Spotlight */}
            <CoordinatorSpotlight
                quote={t("coordinator_quote")}
                name={t("coordinator_name")}
                role={t("coordinator_role")}
                category={validatedCategory}
                imageSrc="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=400"
            />

            {/* 6. CTA */}
            <CategoryCTA category={validatedCategory} />
        </main>
    );
}