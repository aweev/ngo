"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createContentPage, checkSlugAvailable } from "@/actions/content";
import { normalizeSlug, PAGE_CATEGORIES } from "@/lib/content/slug";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { Link } from "@/lib/navigation";

export default function NewContentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [slugTouched, setSlugTouched] = useState(false);
    const [slugCheck, setSlugCheck] = useState<{ slug: string; state: "ok" | "taken" | "invalid"; msg: string } | null>(null);
    const [category, setCategory] = useState<string>("page");
    const [excerpt, setExcerpt] = useState("");
    const [metaTitle, setMetaTitle] = useState("");
    const [metaDescription, setMetaDescription] = useState("");
    const [coverUrl, setCoverUrl] = useState("");
    const [coverAlt, setCoverAlt] = useState("");

    // Auto-suggest the slug from the title until the editor customizes it —
    // derived during render (no state-sync effect needed).
    const suggestedSlug = slugTouched ? slug : normalizeSlug(title);
    const debouncedSlug = useMemo(() => suggestedSlug.trim(), [suggestedSlug]);

    // Availability feedback is derived: "checking" while the last completed
    // check targets a different slug than the current one. All setState calls
    // happen inside the deferred callback (never synchronously in the effect).
    const checking = debouncedSlug !== "" && slugCheck?.slug !== debouncedSlug;
    const visibleSlugState: "idle" | "checking" | "ok" | "taken" | "invalid" = !debouncedSlug
        ? "idle"
        : checking
          ? "checking"
          : slugCheck!.state;
    const visibleSlugMsg = !debouncedSlug || checking ? null : slugCheck!.msg;

    useEffect(() => {
        if (!debouncedSlug) return;
        let alive = true;
        const t = setTimeout(async () => {
            const res = await checkSlugAvailable(debouncedSlug);
            if (!alive) return;
            setSlugCheck({
                slug: debouncedSlug,
                state: res.available ? "ok" : res.error?.includes("already in use") ? "taken" : "invalid",
                msg: res.available ? "Slug is available." : (res.error ?? "Slug unavailable."),
            });
        }, 400);
        return () => {
            alive = false;
            clearTimeout(t);
        };
    }, [debouncedSlug]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!title.trim()) {
            setError("Title is required.");
            return;
        }
        if (visibleSlugState === "taken" || visibleSlugState === "invalid") {
            setError(visibleSlugMsg ?? "Fix the slug before saving.");
            return;
        }
        setLoading(true);
        const content: Record<string, unknown> = { category };
        if (excerpt.trim()) content.excerpt = excerpt.trim();
        if (coverAlt.trim()) content.cover_alt_text = coverAlt.trim();
        const res = await createContentPage({
            title: title.trim(),
            slug: debouncedSlug,
            status: "draft",
            content,
            meta_title: metaTitle.trim() || null,
            meta_description: metaDescription.trim() || null,
            cover_image_url: coverUrl.trim() || null,
            published_at: null,
            created_by: null,
        });
        setLoading(false);
        if (res.error || !res.data) {
            setError(res.error ?? "Unable to create page.");
            return;
        }
        const id = (res.data as { id: string }).id;
        router.push(`/admin/content/${id}`);
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href="/admin/content">
                        <ArrowLeft className="h-4 w-4" /> Back to Pages
                    </Link>
                </Button>
            </div>

            <PageHeader
                title="New content page"
                description="Pages start as drafts. Add translations per locale, request review, then publish — publishing requires approval and the content.publish permission."
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <FilePlus2 className="h-4 w-4 text-emerald-500" /> Page details
                        </CardTitle>
                        <CardDescription>The slug becomes the URL — it must be unique and can&apos;t be a reserved word.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
                            <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Our mission and vision" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slug</label>
                            <Input
                                required
                                value={suggestedSlug}
                                onChange={(e) => {
                                    setSlug(e.target.value);
                                    setSlugTouched(true);
                                }}
                                placeholder="e.g. about-mission-vision"
                                className="font-mono"
                            />
                            {visibleSlugMsg && (
                                <p className={`text-xs ${visibleSlugState === "ok" ? "text-emerald-600" : visibleSlugState === "checking" ? "text-muted-foreground" : "text-red-500"}`}>
                                    {visibleSlugState === "checking" ? "Checking availability…" : visibleSlugMsg}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
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
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Excerpt</label>
                            <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary shown in listings…" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">SEO</CardTitle>
                        <CardDescription>Per-page search metadata. Falls back to title/excerpt when empty.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta title</label>
                            <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={200} placeholder="Defaults to the page title" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta description</label>
                            <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={500} placeholder="Defaults to the excerpt" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cover image URL</label>
                                <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cover alt text</label>
                                <Input value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} maxLength={300} placeholder="Describe the image" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/content">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={loading || visibleSlugState === "checking"}>
                        {loading ? "Creating…" : "Create draft"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
