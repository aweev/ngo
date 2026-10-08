"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createConversation, sendMessage } from "@/actions/messaging";
import type { ConversationType } from "@/types/domain/messaging";

export function NewThreadForm() {
    const router = useRouter();
    const t = useTranslations("Admin.Messaging.New.Form");
    const [title, setTitle] = useState("");
    const [type, setType] = useState<ConversationType>("group");
    const [firstMessage, setFirstMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim().length < 2 || firstMessage.trim().length === 0) {
            setError(t("required"));
            return;
        }
        setSending(true);
        setError("");
        const created = await createConversation({
            title: title.trim(),
            type,
            participant_ids: [],
            is_archived: false,
        });
        if (!created.data) {
            setError(created.error || t("create_failed"));
            setSending(false);
            return;
        }
        const sent = await sendMessage(created.data.id, firstMessage.trim());
        if (!sent.data) {
            setError(sent.error || t("send_failed"));
            setSending(false);
            return;
        }
        toast.success(t("started"));
        router.push(`/admin/messaging/${created.data.id}`);
        router.refresh();
    };

    return (
        <Card>
            <CardContent className="p-6">
                <form onSubmit={submit} className="max-w-xl space-y-4">
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
                    )}
                    <div className="space-y-2">
                        <Label>{t("title_label")}</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t("title_placeholder")}
                            maxLength={120}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("type_label")}</Label>
                        <Select value={type} onValueChange={(v) => setType(v as ConversationType)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="direct">{t("type_direct")}</SelectItem>
                                <SelectItem value="group">{t("type_group")}</SelectItem>
                                <SelectItem value="broadcast">{t("type_broadcast")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t("message_label")}</Label>
                        <Textarea
                            value={firstMessage}
                            onChange={(e) => setFirstMessage(e.target.value)}
                            placeholder={t("message_placeholder")}
                            rows={4}
                        />
                    </div>
                    <Button type="submit" disabled={sending}>
                        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("start")}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
