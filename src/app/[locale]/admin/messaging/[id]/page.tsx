import { notFound } from "next/navigation";
import { PageHeader } from "@/components/manage/page-header";
import { Badge } from "@/components/ui/badge";
import { getConversation, getMessages, getThreadPeople } from "@/actions/messaging";
import { getAuthContext } from "@/lib/auth/guards";
import { MessagingThread } from "@/components/admin/messaging-thread";

export const dynamic = "force-dynamic";

export default async function MessagingThreadPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { id } = await params;
    const ctx = await getAuthContext();
    const [{ data: conversation }, { data: messages }, { data: people }] = await Promise.all([
        getConversation(id),
        getMessages(id),
        getThreadPeople(id),
    ]);
    if (!conversation) notFound();

    return (
        <div className="space-y-4">
            <PageHeader
                title={conversation.title || "Conversation"}
                description={`${conversation.type} thread`}
                action={<Badge variant="outline">{conversation.type}</Badge>}
            />
            <MessagingThread
                conversationId={conversation.id}
                currentUserId={ctx?.userId ?? ""}
                initialMessages={messages ?? []}
                people={people ?? []}
            />
        </div>
    );
}
