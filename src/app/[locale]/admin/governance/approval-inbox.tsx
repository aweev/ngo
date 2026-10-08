"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, MessageSquareWarning, Loader2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { reviewApproval } from "@/actions/governance";
import type { GovernanceApproval } from "@/types/domain/governance";

type Decision = "approved" | "rejected" | "changes_requested";

export function ApprovalInbox({
    initialPending,
    decided,
}: {
    initialPending: GovernanceApproval[];
    decided: GovernanceApproval[];
}) {
    const t = useTranslations("Admin.Governance.Approvals");
    const [pending, setPending] = useState(initialPending);
    const [actingId, setActingId] = useState<string | null>(null);
    const [noteFor, setNoteFor] = useState<string | null>(null);
    const [note, setNote] = useState("");

    const review = async (id: string, decision: Decision) => {
        setActingId(id);
        const result = await reviewApproval(id, decision, noteFor === id ? note : undefined);
        setActingId(null);
        if (result.data) {
            setPending((cur) => cur.filter((r) => r.id !== id));
            setNoteFor(null);
            setNote("");
            toast.success(t("toast_decision", { decision: decision.replace("_", " ") }));
        } else {
            toast.error(result.error || t("could_not_record"));
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Inbox className="h-4 w-4 text-primary" /> {t("pending_title")} ({pending.length})
                    </CardTitle>
                    <CardDescription>{t("pending_description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {pending.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">{t("empty")}</p>
                    ) : (
                        pending.map((r) => (
                            <div key={r.id} className="space-y-2 rounded-lg border p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <Badge variant="outline">{r.entity_type.replace(/_/g, " ")}</Badge>
                                    <span className="text-[11px] text-muted-foreground">
                                        {new Date(r.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <p className="font-mono text-xs text-muted-foreground">{r.entity_id}</p>
                                {r.review_notes && <p className="text-sm">{r.review_notes}</p>}
                                {noteFor === r.id ? (
                                    <Textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder={t("note_placeholder")}
                                        rows={2}
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setNoteFor(r.id)}
                                        className="text-xs text-muted-foreground underline hover:text-foreground"
                                    >
                                        {t("add_note")}
                                    </button>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" onClick={() => review(r.id, "approved")} disabled={actingId === r.id}>
                                        {actingId === r.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                                        {t("approve")}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => review(r.id, "changes_requested")} disabled={actingId === r.id}>
                                        <MessageSquareWarning className="mr-1 h-3 w-3" />
                                        {t("changes")}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => review(r.id, "rejected")} disabled={actingId === r.id}>
                                        <X className="mr-1 h-3 w-3" />
                                        {t("reject")}
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">{t("recent_title")}</CardTitle>
                    <CardDescription>{t("recent_description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {decided.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">{t("no_decisions")}</p>
                    ) : (
                        decided.map((r) => (
                            <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                                <span className="min-w-0 truncate">
                                    <span className="text-muted-foreground">{r.entity_type.replace(/_/g, " ")} · </span>
                                    <span className="font-mono text-xs">{r.entity_id.slice(0, 8)}</span>
                                </span>
                                <Badge variant={r.status === "approved" ? "default" : "secondary"}>{r.status.replace(/_/g, " ")}</Badge>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
