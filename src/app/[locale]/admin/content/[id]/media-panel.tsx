"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getMediaLibrary, attachMediaItem, uploadMediaItem, updateMediaAltText, deleteMediaItem } from "@/actions/media";
import { Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

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
    const t = useTranslations("Admin.Content.Media");
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
            setError(t("name_required"));
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
        if (!window.confirm(t("delete_confirm", { name: itemName }))) return;
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
                <CardTitle className="text-base">{t("title")}</CardTitle>
                <CardDescription>
                    Attach hosted image/video URLs with alt text. Alt text is required for
                    accessibility — items without it are flagged below.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search_placeholder")} />
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
                                    title={t("delete_record")}
                                    onClick={() => remove(m.id, m.name)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {m.mime_type?.startsWith("image/") !== false && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.file_url} alt={m.alt_text ?? ""} className="mb-1 h-24 w-full rounded object-cover" loading="lazy" />
                            )}
                            {!m.alt_text && <p className="mb-1 font-semibold text-amber-600">{t("alt_missing_label")}</p>}
                            {editingAlt === m.id ? (
                                <div className="flex gap-1">
                                    <Input value={altDraft} onChange={(e) => setAltDraft(e.target.value)} placeholder={t("alt_text")} className="h-7 text-xs" />
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
                    {items.length === 0 && <p className="text-sm text-muted-foreground">{t("no_media")}</p>}
                </div>

                <div className="rounded-lg border border-dashed p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("upload_section")}
                    </p>
                    <form
                        className="mb-3 flex flex-col gap-2 sm:flex-row"
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const data = new FormData(e.currentTarget);
                            if (!(data.get("file") instanceof File) || (data.get("file") as File).size === 0) {
                                setError(t("choose_file"));
                                return;
                            }
                            setBusy("upload");
                            setError(null);
                            const res = await uploadMediaItem(data);
                            setBusy(null);
                            if (res.error) setError(res.error);
                            else {
                                e.currentTarget.reset();
                                window.location.reload();
                            }
                        }}
                    >
                        <Input type="file" name="file" accept="image/*,video/*" className="flex-1" />
                        <Input name="alt_text" placeholder={t("alt_recommended")} className="flex-1" />
                        <Button size="sm" type="submit" disabled={busy !== null} className="gap-1">
                            <Upload className="h-3.5 w-3.5" />
                            {busy === "upload" ? t("uploading") : t("upload")}
                        </Button>
                    </form>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("attach_hosted")}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name_label")} />
                        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("cover_url_placeholder")} className="sm:col-span-2" />
                    </div>
                    <div className="mt-2 flex gap-2">
                        <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder={t("alt_recommended")} className="flex-1" />
                        <Button size="sm" disabled={busy !== null} onClick={attach}>
                            {busy === "attach" ? t("attaching") : t("attach")}
                        </Button>
                    </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}
            </CardContent>
        </Card>
    );
}
