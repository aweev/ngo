import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTags } from "@/actions/tags";
import { Plus, Tag as TagIcon } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function TagsPage() {
    const { data: tags } = await getTags();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Global Tagging Engine"
                description="Categorize and cross-link workers, donors, projects, and events using system tags."
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/tags/new">
                            <Plus className="h-4 w-4" />
                            Create Tag
                        </Link>
                    </Button>
                }
            />

            <div className="rounded-lg border bg-card p-6">
                {(!tags || tags.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
                        <TagIcon className="h-8 w-8 mx-auto text-muted-foreground/50" />
                        <p>No global tags defined yet.</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {tags.map((t) => (
                            <Badge key={t.id} style={{ backgroundColor: t.color || "#6366f1" }} className="text-white px-3 py-1 text-xs gap-1.5">
                                <TagIcon className="h-3 w-3" />
                                {t.name}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
