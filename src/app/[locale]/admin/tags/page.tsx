import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getTags } from "@/actions/tags";
import { Plus, Tag as TagIcon } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function TagsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Tags" });
    const { data: tags } = await getTags();

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/tags/new">
                            <Plus className="h-4 w-4" />
                            {t("create_tag")}
                        </Link>
                    </Button>
                }
            />

            <div className="rounded-lg border bg-card p-6">
                {(!tags || tags.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
                        <TagIcon className="h-8 w-8 mx-auto text-muted-foreground/50" />
                        <p>{t("empty")}</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                            <Badge key={tag.id} style={{ backgroundColor: tag.color || "#6366f1" }} className="text-white px-3 py-1 text-xs gap-1.5">
                                <TagIcon className="h-3 w-3" />
                                {tag.name}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
