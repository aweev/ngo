"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, SendHorizonal } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { sendMessage } from "@/actions/messaging";
import type { ConversationMessage } from "@/types/domain/messaging";

export interface ThreadPerson {
    userId: string;
    name: string | null;
    email: string | null;
}

function labelFor(person: ThreadPerson | undefined, userId: string, currentUserId: string): string {
    if (userId === currentUserId) return "You";
    if (person?.name) return person.name;
    if (person?.email) return person.email;
    return userId.slice(0, 8);
}

function initialsOf(label: string): string {
    const parts = label.split(/[\s@._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return label.slice(0, 2).toUpperCase();
}

export function MessagingThread({
    conversationId,
    currentUserId,
    initialMessages,
    people,
    canSend = true,
}: {
    conversationId: string;
    currentUserId: string;
    initialMessages: ConversationMessage[];
    people: ThreadPerson[];
    /** Hidden for read-only roles (e.g. members without messaging.manage). */
    canSend?: boolean;
}) {
    const router = useRouter();
    const t = useTranslations("Admin.Messaging.Thread");
    const [messages, setMessages] = useState(initialMessages);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const peopleById = new Map(people.map((p) => [p.userId, p]));

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [messages.length]);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = draft.trim();
        if (!content || sending) return;
        setSending(true);
        const result = await sendMessage(conversationId, content);
        if (result.data) {
            setMessages((cur) => [...cur, result.data as ConversationMessage]);
            setDraft("");
            router.refresh();
        } else {
            toast.error(result.error || t("send_failed"));
        }
        setSending(false);
    };

    return (
        <div className="flex flex-col rounded-lg border bg-card" style={{ minHeight: "50vh" }}>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
                {messages.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                        {t("empty")}
                    </p>
                ) : (
                    messages.map((m) => {
                        const mine = m.sender_id === currentUserId;
                        const label = labelFor(peopleById.get(m.sender_id), m.sender_id, currentUserId);
                        return (
                            <div key={m.id} className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                                <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback className="text-xs">{initialsOf(label)}</AvatarFallback>
                                </Avatar>
                                <div className={`max-w-[75%] space-y-1 ${mine ? "text-right" : ""}`}>
                                    <p className="text-[11px] font-medium text-muted-foreground">
                                        {label} · {new Date(m.created_at).toLocaleString()}
                                    </p>
                                    <div className={`inline-block rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                        {m.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={bottomRef} />
            </div>
            {canSend && (
            <form onSubmit={send} className="flex gap-2 border-t p-3 md:p-4">
                <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t("placeholder")}
                    rows={1}
                    className="min-h-10 resize-none"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send(e);
                        }
                    }}
                />
                <Button type="submit" size="icon" disabled={sending || draft.trim().length === 0} className="shrink-0">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                </Button>
            </form>
            )}
            {!canSend && (
                <p className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
                    {t("read_only")}
                </p>
            )}
        </div>
    );
}
