"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getMediaLibrary, attachMediaItem, updateMediaAltText, deleteMediaItem } from "@/actions/media";
import { Trash2 } from "lucide-react";

export type MediaRow = {
    id: string;
    name: string;
    file_url: string;
    mime_type: string | null;
    alt_text: string | null;
    created_at: string;
};

export default function MediaPanel({
    initial,
    onUseAsCover,
}: {
    initial: MediaRow[];
    onUseAsCover?: (url: string, alt: string) => void;
}) {
    const [items, setItems] = useState<MediaRow[]>(initial);
    const [search, setSearch] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [alt, setAlt] = useState("");
    const [editingAlt, setEditingAlt] = useState<string | null>(null);
    const [altDraft, setAltDraft] = useState("");

    const doSearch = async () => {
        setBusy("search");
        setError(null);
        const res = await getMediaLibrary(search.trim() || undefined);
        setBusy(null);
        if (res.error) setError(res.error);
        else setItems((res.data ?? []) as MediaRow[]);
    };

    const attach = async () => {
        if (!name.trim() || !url.trim()) {
            setError("Name and file URL are required.");
            return;
        }
        setBusy("attach");
        setError(null);
        const res = await attachMediaItem({ name: name.trim(), file_url: url.trim(), alt_text: alt.trim() || null });
        setBusy(null);
        if (res.error) setError(res.error);
        else {
            setName("");
            setUrl("");
            setAlt("");
            window.location.reload();
        }
    };

    const saveAlt = async (id: string) => {
        setBusy(`alt:${id}`);
        setError(null);
        const res = await updateMediaAltText(id, altDraft);
        setBusy(null);
        if (res.error) setError(res.error);
        else {
            setEditingAlt(null);
            setItems((prev) => prev.map((m) => (m.id === id ? { ...m, alt_text: altDraft.trim() || null } : m)));
        }
    };

    const remove = async (id: string, itemName: string) => {
        if (!window.confirm(`Delete library record "${itemName}"? The storage file itself is kept — this removes the catalog entry.`)) return;
        setBusy(`del:${id}`);
        setError(null);
        const res = await deleteMediaItem(id);
        setBusy(null);
        if (res.error) setError(res.error);
        else setItems((prev) => prev.filter((m) => m.id !== id));
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Media library</CardTitle>
                <CardDescription>
                    Attach hosted image/video URLs with alt text. Alt text is required for
                    accessibility — items without it are flagged below.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name…" />
                    <Button size="sm" variant="outline" disabled={busy !== null} onClick={doSearch}>
                        Search
                    </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((m) => (
                        <div key={m.id} className="rounded-lg border p-2 text-xs">
                            <div className="mb-1 flex items-center justify-between gap-1">
                                <span className="truncate font-semibold" title={m.name}>
                                    {m.name}
                                </span>
                                <button
                                    type="button"
                                    className="shrink-0 text-muted-foreground hover:text-red-500"
                                    title="Delete library record"
                                    onClick={() => remove(m.id, m.name)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {m.mime_type?.startsWith("image/") !== false && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.file_url} alt={m.alt_text ?? ""} className="mb-1 h-24 w-full rounded object-cover" loading="lazy" />
                            )}
                            {!m.alt_text && <p className="mb-1 font-semibold text-amber-600">Missing alt text</p>}
                            {editingAlt === m.id ? (
                                <div className="flex gap-1">
                                    <Input value={altDraft} onChange={(e) => setAltDraft(e.target.value)} placeholder="Alt text" className="h-7 text-xs" />
                                    <Button size="sm" className="h-7" disabled={busy !== null} onClick={() => saveAlt(m.id)}>
                                        Save
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between gap-1">
                                    <span className="truncate text-muted-foreground" title={m.alt_text ?? ""}>
                                        {m.alt_text || "—"}
                                    </span>
                                    <div className="flex shrink-0 gap-1">
                                        <button
                                            type="button"
                                            className="text-primary hover:underline"
                                            onClick={() => {
                                                setEditingAlt(m.id);
                                                setAltDraft(m.alt_text ?? "");
                                            }}
                                        >
                                            Edit alt
                                        </button>
                                        {onUseAsCover && (
                                            <button
                                                type="button"
                                                className="text-primary hover:underline"
                                                onClick={() => onUseAsCover(m.file_url, m.alt_text ?? "")}
                                            >
                                                Use as cover
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {items.length === 0 && <p className="text-sm text-muted-foreground">No media found.</p>}
                </div>

                <div className="rounded-lg border border-dashed p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Attach hosted file (images & video, max 25 MB)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
                        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="sm:col-span-2" />
                    </div>
                    <div className="mt-2 flex gap-2">
                        <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Alt text (recommended)" className="flex-1" />
                        <Button size="sm" disabled={busy !== null} onClick={attach}>
                            {busy === "attach" ? "Attaching…" : "Attach"}
                        </Button>
                    </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
            </CardContent>
        </Card>
    );
}
