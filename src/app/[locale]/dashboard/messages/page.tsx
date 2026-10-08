import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { Link } from "@/lib/navigation";
import { getConversations } from "@/actions/messaging";

export const dynamic = "force-dynamic";

export default async function DashboardMessagesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Dashboard.Messages" });
    const { data: conversations } = await getConversations();
    const all = conversations ?? [];

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("desc")}
            />
            <div className="rounded-lg border bg-card p-6">
                {all.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                        <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                        <p>{t("empty")}</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {all.map((c) => (
                            <Link
                                key={c.id}
                                href={`/dashboard/messages/${c.id}`}
                                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 hover:opacity-80"
                            >
                                <div className="min-w-0">
                                    <span className="text-sm font-semibold">{c.title || t("untitled")}</span>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {c.last_message_preview || t("no_preview")}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Badge variant="outline" className="text-[11px]">{c.type}</Badge>
                                    <span className="text-[11px] text-muted-foreground">
                                        {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : ""}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
