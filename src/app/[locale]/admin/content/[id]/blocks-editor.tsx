"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    createContentBlock,
    updateContentBlock,
    deleteContentBlock,
    reorderContentBlocks,
} from "@/actions/content-blocks";
import { BLOCK_TYPES } from "@/lib/content/blocks";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";

export type BlockRow = {
    id: string;
    name: string;
    type: string;
    content: Record<string, unknown>;
    sort_order: number;
};

export default function BlocksEditor({ pageId, initial }: { pageId: string; initial: BlockRow[] }) {
    const [blocks, setBlocks] = useState<BlockRow[]>(initial);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [editing, setEditing] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editType, setEditType] = useState<string>("text");
    const [editJson, setEditJson] = useState("{}");
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState<string>("text");

    const refresh = () => window.location.reload();

    const startEdit = (b: BlockRow) => {
        setEditing(b.id);
        setEditName(b.name);
        setEditType(b.type);
        setEditJson(JSON.stringify(b.content ?? {}, null, 2));
    };

    const saveEdit = async (id: string) => {
        let parsed: Record<string, unknown>;
        try {
            parsed = JSON.parse(editJson || "{}");
        } catch {
            setError("Block content must be valid JSON.");
            return;
        }
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            setError("Block content must be a JSON object.");
            return;
        }
        setBusy(`save:${id}`);
        setError(null);
        const res = await updateContentBlock(id, { name: editName, type: editType, content: parsed });
        setBusy(null);
        if (res.error) setError(res.error);
        else {
            setEditing(null);
            refresh();
        }
    };

    const add = async () => {
        if (!newName.trim()) {
            setError("New block needs a name.");
            return;
        }
        setBusy("add");
        setError(null);
        const res = await createContentBlock({ page_id: pageId, name: newName.trim(), type: newType, content: {} });
        setBusy(null);
        if (res.error) setError(res.error);
        else {
            setNewName("");
            refresh();
        }
    };

    const remove = async (id: string) => {
        if (!window.confirm("Delete this block? This cannot be undone.")) return;
        setBusy(`del:${id}`);
        setError(null);
        const res = await deleteContentBlock(id);
        setBusy(null);
        if (res.error) setError(res.error);
        else {
            setBlocks((prev) => prev.filter((b) => b.id !== id));
            refresh();
        }
    };

    const move = async (index: number, dir: -1 | 1) => {
        const next = [...blocks];
        const j = index + dir;
        if (j < 0 || j >= next.length) return;
        const tmp = next[index]!;
        next[index] = next[j]!;
        next[j] = tmp;
        setBlocks(next);
        setError(null);
        const res = await reorderContentBlocks(
            pageId,
            next.map((b) => b.id),
        );
        if (res.error) {
            setError(res.error);
            refresh();
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Content blocks</CardTitle>
                <CardDescription>
                    Composable sections (hero, text, image, gallery, CTA, embed). The public homepage
                    reads mostly from page fields today — blocks are the path forward for rich layouts.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {blocks.length === 0 && (
                    <p className="text-sm text-muted-foreground">No blocks yet. Add the first one below.</p>
                )}
                {blocks.map((b, i) => (
                    <div key={b.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <span>{b.name}</span>
                                <Badge variant="secondary" className="text-[11px]">{b.type}</Badge>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => move(i, -1)} title="Move up">
                                    <ArrowUp className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => move(i, 1)} title="Move down">
                                    <ArrowDown className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => (editing === b.id ? setEditing(null) : startEdit(b))}>
                                    {editing === b.id ? "Cancel" : "Edit"}
                                </Button>
                                <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => remove(b.id)} title="Delete block">
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                </Button>
                            </div>
                        </div>
                        {editing === b.id && (
                            <div className="mt-3 space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</label>
                                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
                                        <Select value={editType} onValueChange={setEditType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BLOCK_TYPES.map((t) => (
                                                    <SelectItem key={t} value={t}>
                                                        {t}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Content (JSON object) — image blocks support image_src + alt keys
                                    </label>
                                    <Textarea value={editJson} onChange={(e) => setEditJson(e.target.value)} rows={5} className="font-mono text-xs" />
                                </div>
                                <Button size="sm" disabled={busy !== null} onClick={() => saveEdit(b.id)}>
                                    {busy === `save:${b.id}` ? "Saving…" : "Save block"}
                                </Button>
                            </div>
                        )}
                    </div>
                ))}

                <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New block name</label>
                        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Hero split" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
                        <Select value={newType} onValueChange={setNewType}>
                            <SelectTrigger className="w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {BLOCK_TYPES.map((t) => (
                                    <SelectItem key={t} value={t}>
                                        {t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button size="sm" disabled={busy !== null} onClick={add}>
                        {busy === "add" ? "Adding…" : "Add block"}
                    </Button>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
            </CardContent>
        </Card>
    );
}
