"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { transitionContentWorkflow } from "@/actions/content";
import type { ContentWorkflowState } from "@/lib/content/translations";

export default function WorkflowCard({
    pageId,
    current,
    allowed,
    previewToken,
    locale,
}: {
    pageId: string;
    current: ContentWorkflowState;
    allowed: ContentWorkflowState[];
    previewToken: string | null;
    locale: string;
}) {
    const [busy, setBusy] = useState<ContentWorkflowState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [showNotesFor, setShowNotesFor] = useState<ContentWorkflowState | null>(null);

    const run = async (to: ContentWorkflowState) => {
        setError(null);
        if ((to === "in_review" || to === "changes_requested") && showNotesFor !== to) {
            setShowNotesFor(to);
            return;
        }
        setBusy(to);
        const res = await transitionContentWorkflow(pageId, to, notes.trim() || undefined);
        setBusy(null);
        setShowNotesFor(null);
        if (res.error) setError(res.error);
        else window.location.reload();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Workflow & publishing</CardTitle>
                <CardDescription>
                    Current state: <Badge variant="outline" className="capitalize">{current.replace(/_/g, " ")}</Badge>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {allowed.length === 0 && (
                        <p className="text-xs text-muted-foreground">No further transitions from this state.</p>
                    )}
                    {allowed.map((to) => (
                        <Button
                            key={to}
                            size="sm"
                            variant={to === "published" ? "default" : "outline"}
                            disabled={busy !== null}
                            onClick={() => run(to)}
                            className="capitalize"
                        >
                            {busy === to ? "Working…" : to === "published" ? "Approve & publish" : to.replace(/_/g, " ")}
                        </Button>
                    ))}
                </div>
                {showNotesFor && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Reviewer note (stored in approval history)
                        </label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What should change? What was verified?" />
                        <div className="flex gap-2">
                            <Button size="sm" disabled={busy !== null} onClick={() => run(showNotesFor)}>
                                Confirm
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setShowNotesFor(null)}>
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="rounded-md border p-3 text-xs text-muted-foreground">
                    {previewToken ? (
                        <p>
                            Draft preview link (share freely — token-gated, never indexed):{" "}
                            <a className="font-mono text-primary hover:underline" href={`/${locale}/public/preview/${previewToken}`}>
                                /{locale}/public/preview/{previewToken.slice(0, 8)}…
                            </a>
                        </p>
                    ) : (
                        <p>Preview link unavailable (migration 24 not applied yet).</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
