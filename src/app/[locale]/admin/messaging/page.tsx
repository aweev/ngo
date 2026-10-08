import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getConversations } from "@/actions/messaging";
import { Plus, MessageSquare } from "lucide-react";
import { Link } from "@/lib/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Conversation, ConversationType } from "@/types/domain/messaging";

export const dynamic = "force-dynamic";

interface ThreadLabels {
    empty: string;
    untitled: string;
    noMessages: string;
}

function ThreadList({ conversations, labels }: { conversations: Conversation[]; labels: ThreadLabels }) {
    if (conversations.length === 0) {
        return (
            <div className="py-6 text-center text-sm text-muted-foreground">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p>{labels.empty}</p>
            </div>
        );
    }
    return (
        <div className="divide-y">
            {conversations.map((c) => (
                <Link
                    key={c.id}
                    href={`/admin/messaging/${c.id}`}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 hover:opacity-80"
                >
                    <div className="min-w-0">
                        <span className="text-sm font-semibold">{c.title || labels.untitled}</span>
                        <p className="truncate text-xs text-muted-foreground">
                            {c.last_message_preview || labels.noMessages}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className="text-[11px]">{c.type satisfies ConversationType}</Badge>
                        <span className="text-[11px] text-muted-foreground">
                            {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : ""}
                        </span>
                    </div>
                </Link>
            ))}
        </div>
    );
}

export default async function MessagingPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Messaging" });
    const { data: conversations } = await getConversations();
    const all = conversations ?? [];

    const tabs: { value: string; label: string; match: (c: Conversation) => boolean }[] = [
        { value: "all", label: t("tabs.all"), match: () => true },
        { value: "direct", label: t("tabs.direct"), match: (c) => c.type === "direct" },
        { value: "group", label: t("tabs.group"), match: (c) => c.type === "group" },
        { value: "broadcast", label: t("tabs.broadcast"), match: (c) => c.type === "broadcast" },
    ];
    const labels: ThreadLabels = {
        empty: t("empty"),
        untitled: t("untitled"),
        noMessages: t("no_messages"),
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/messaging/new">
                            <Plus className="h-4 w-4" />
                            {t("new_thread")}
                        </Link>
                    </Button>
                }
            />

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-auto">
                    {tabs.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.label} ({all.filter(tab.match).length})
                        </TabsTrigger>
                    ))}
                </TabsList>
                {tabs.map((tab) => (
                    <TabsContent key={tab.value} value={tab.value} className="pt-4">
                        <div className="rounded-lg border bg-card p-6">
                            <ThreadList conversations={all.filter(tab.match)} labels={labels} />
                        </div>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
