"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateContentPage, checkSlugAvailable } from "@/actions/content";
import { PAGE_CATEGORIES } from "@/lib/content/slug";
import { TriangleAlert } from "lucide-react";

export type EditorPage = {
    id: string;
    title: string;
    slug: string;
    content: Record<string, unknown>;
    meta_title: string | null;
    meta_description: string | null;
    cover_image_url: string | null;
};

const RESERVED_CONTENT_KEYS = new Set(["translations", "locales", "category"]);

export default function EditorForm({
    page,
    missingKeys,
}: {
    page: EditorPage;
    missingKeys: string[];
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedAt, setSavedAt] = useState<string | null>(null);
    const [title, setTitle] = useState(page.title);
    const [slug, setSlug] = useState(page.slug);
    const [slugMsg, setSlugMsg] = useState<string | null>(null);
    const [category, setCategory] = useState<string>(
        typeof page.content.category === "string" ? page.content.category : "page",
    );
    const [excerpt, setExcerpt] = useState(
        typeof page.content.excerpt === "string" ? page.content.excerpt : "",
    );
    const [body, setBody] = useState(
        typeof page.content.body === "string" ? page.content.body : "",
    );
    const [coverAlt, setCoverAlt] = useState(
        typeof page.content.cover_alt_text === "string" ? page.content.cover_alt_text : "",
    );
    const [metaTitle, setMetaTitle] = useState(page.meta_title ?? "");
    const [metaDescription, setMetaDescription] = useState(page.meta_description ?? "");
    const [coverUrl, setCoverUrl] = useState(page.cover_image_url ?? "");
    const [pairs, setPairs] = useState<{ key: string; value: string }[]>(() =>
        Object.entries(page.content)
            .filter(([k]) => !RESERVED_CONTENT_KEYS.has(k) && !["excerpt", "body", "cover_alt_text"].includes(k))
            .map(([k, v]) => ({ key: k, value: typeof v === "string" ? v : JSON.stringify(v ?? "") })),
    );

    // Slug-uniqueness feedback. "Untouched" (slug still equals the saved one)
    // is derived during render instead of clearing state inside the effect —
    // sync setState in an effect body causes cascading renders.
    const slugTouched = slug.trim() !== page.slug;

    useEffect(() => {
        if (!slugTouched) return;
        const t = setTimeout(async () => {
            const res = await checkSlugAvailable(slug.trim(), page.id);
            setSlugMsg(res.available ? "Slug is available." : (res.error ?? "Slug unavailable."));
        }, 400);
        return () => clearTimeout(t);
    }, [slug, page.id, slugTouched]);

    const handleSave = async () => {
        setError(null);
        setSavedAt(null);
        if (!title.trim()) {
            setError("Title is required.");
            return;
        }
        const content: Record<string, unknown> = { ...(page.content as object), category };
        if (excerpt.trim()) content.excerpt = excerpt.trim();
        else delete content.excerpt;
        if (body.trim()) content.body = body.trim();
        else delete content.body;
        if (coverAlt.trim()) content.cover_alt_text = coverAlt.trim();
        else delete content.cover_alt_text;
        for (const p of pairs) {
            if (!p.key.trim()) continue;
            content[p.key.trim()] =
                p.value.startsWith("{") || p.value.startsWith("[")
                    ? (() => {
                          try {
                              return JSON.parse(p.value);
                          } catch {
                              return p.value;
                          }
                      })()
                    : p.value;
        }
        setSaving(true);
        const res = await updateContentPage(page.id, {
            title: title.trim(),
            slug: slug.trim(),
            content,
            meta_title: metaTitle.trim() || null,
            meta_description: metaDescription.trim() || null,
            cover_image_url: coverUrl.trim() || null,
        });
        setSaving(false);
        if (res.error) {
            setError(res.error);
            return;
        }
        setSavedAt(new Date().toLocaleTimeString());
    };

    return (
        <div className="space-y-6">
            {missingKeys.length > 0 && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                        This page is missing recommended fields the public site reads:{" "}
                        <span className="font-mono font-semibold">{missingKeys.join(", ")}</span>. Add
                        them below as custom fields (or in Blocks) so the section renders fully.
                    </p>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Page fields</CardTitle>
                    <CardDescription>Saving creates a revision snapshot — restorable from History.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slug</label>
                            <Input value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono" />
                            {slugTouched && slugMsg && <p className="text-xs text-muted-foreground">{slugMsg}</p>}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAGE_CATEGORIES.map((c) => (
                                        <SelectItem key={c} value={c}>
                                            {c.replace(/_/g, " ")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Excerpt</label>
                        <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Body</label>
                        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Plain text or Markdown…" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Custom content fields</CardTitle>
                    <CardDescription>Section-specific keys (e.g. headline_primary, cta_label). Reserved keys (translations, category) are managed elsewhere.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {pairs.map((p, i) => (
                        <div key={i} className="flex gap-2">
                            <Input
                                value={p.key}
                                onChange={(e) => setPairs((prev) => prev.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                                placeholder="key"
                                className="font-mono max-w-55"
                            />
                            <Input
                                value={p.value}
                                onChange={(e) => setPairs((prev) => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                                placeholder="value"
                                className="flex-1"
                            />
                            <Button type="button" variant="ghost" size="sm" onClick={() => setPairs((prev) => prev.filter((_, j) => j !== i))}>
                                Remove
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setPairs((prev) => [...prev, { key: "", value: "" }])}>
                        Add field
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">SEO & cover</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta title</label>
                        <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={200} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta description</label>
                        <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={500} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cover image URL</label>
                            <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cover alt text</label>
                            <Input value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} maxLength={300} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {savedAt && <p className="text-sm text-emerald-600">Saved at {savedAt}.</p>}
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                </Button>
            </div>
        </div>
    );
}
