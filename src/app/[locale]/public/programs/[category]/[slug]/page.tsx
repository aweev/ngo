import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProgramCategory } from "@/lib/program-themes";
import { ProjectDeepDiveViewModel } from "@/types/domain-adapters";
import { getPublicProjectBySlug } from "@/actions/public";

// Components
import { ProjectHeader } from "@/components/programs/project/project-header";
import { ProgressTracker } from "@/components/programs/project/progress-tracker";
import { ActionSidebar } from "@/components/programs/project/action-sidebar";
import { UpdatesGallery } from "@/components/programs/project/updates-gallery";
import { ProjectsGrid } from "@/components/programs/category/projects-grid";

// --- Data Fetching ---

async function getProjectDetails(slug: string, category: string, locale = 'en'): Promise<ProjectDeepDiveViewModel | null> {
    // Fetch from Supabase (public RLS exposes active/completed projects), localized.
    const { data } = await getPublicProjectBySlug(slug, locale);

    if (data) {
        if (data.category !== category) return null;
        const status: ProjectDeepDiveViewModel['status'] =
            data.status === 'planning' ? 'Planning' :
            data.status === 'completed' ? 'Completed' : 'Active';

        return {
            id: data.id,
            slug: data.slug || slug,
            title: data.name,
            category: category,
            summary: data.description ? data.description.substring(0, 150) + "..." : "",
            description: data.description || "",
            status,
            location: data.location || "Remote",
            startDate: data.start_date || "",
            endDate: data.end_date || "",
            imageSrc: data.cover_image_url || "/logo.svg",
            lead: {
                name: "Program team",
                role: "",
                avatar: "/logo.svg"
            },
            funding: data.budget != null || data.spent != null ? {
                current: Number(data.spent) || 0,
                goal: Number(data.budget) || 0,
                currency: data.currency || "EUR"
            } : undefined,
            volunteerNeeds: undefined,
            updates: []
        };
    }

    return null;
}

// --- Metadata ---

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string; slug: string }> }): Promise<Metadata> {
    const { slug, category, locale } = await params;

    // We use getTranslations to format the title if project not found
    const t = await getTranslations({ locale, namespace: "Project" });
    const project = await getProjectDetails(slug, category, locale);

    if (!project) {
        return {
            title: t("Status.not_found"),
        };
    }

    return {
        title: `${project.title} - ${t("meta_suffix")}`,
        description: project.summary
    };
}

// --- Page Component ---

export default async function ProjectPage({ params }: { params: Promise<{ locale: string; category: string; slug: string }> }) {
    const { category, slug, locale } = await params;
    const project = await getProjectDetails(slug, category, locale);

    if (!project) notFound();

    // Map string category to strong type
    const typedCategory = category as ProgramCategory;

    return (
        <main>
            <ProjectHeader project={project} category={typedCategory} />

            <div className="container mx-auto px-4 py-12 md:py-20">
                <div className="grid lg:grid-cols-12 gap-12">

                    {/* Left: Content (8 Cols) */}
                    <div className="lg:col-span-8">
                        <ProgressTracker project={project} category={typedCategory} />

                        {/* Render database content as text until structured rich text is available. */}
                        <article className="prose prose-lg prose-headings:font-serif prose-headings:font-bold prose-primary max-w-none text-muted-foreground">
                            <p className="whitespace-pre-wrap">{project.description}</p>
                        </article>

                        <UpdatesGallery updates={project.updates} />
                    </div>

                    {/* Right: Sidebar (4 Cols) */}
                    <aside className="lg:col-span-4 relative">
                        <ActionSidebar project={project} category={typedCategory} />
                    </aside>

                </div>
            </div>

            {/* Related Projects - Pass locale to grid if needed for links */}
            <div className="bg-muted/20 border-t border-border">
                <ProjectsGrid
                    category={typedCategory}
                    projects={[]} // In real app: fetchRelatedProjects(category, project.id)
                />
            </div>
        </main>
    );
}