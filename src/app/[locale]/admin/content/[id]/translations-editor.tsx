"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    upsertPageTranslation,
    setPageTranslationStatus,
    requestAiTranslation,
} from "@/actions/content";
import { SUPPORTED_LOCALES, LOCALE_LABELS, type SupportedLocale } from "@/lib/i18n/locales";
import { exportTranslations, importTranslations, translationCompleteness } from "@/lib/content/translations";
import { TriangleAlert, Sparkles } from "lucide-react";

export type TranslationRow = {
    locale: string;
    status: string;
    title: string;
    content: Record<string, unknown>;
    meta_title: string | null;
    meta_description: string | null;
    cover_image_url: string | null;
    cover_alt_text: string | null;
    cta_label: string | null;
    cta_url: string | null;
    category_label: string | null;
    version: number;
    updated_at: string;
};

function str(v: unknown): string {
    return typeof v === "string" ? v : "";
}

export default function TranslationsEditor({
    pageId,
    pageSlug,
    rows,
    aiConfigured,
}: {
    pageId: string;
    pageSlug: string;
    rows: TranslationRow[];
    aiConfigured: boolean;
}) {
    const byLocale = new Map(rows.map((r) => [r.locale, r]));
    const [open, setOpen] = useState<SupportedLocale | null>("en");
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});

    const draftFor = (locale: string, row?: TranslationRow): Record<string, string> => {
        const d = drafts[locale];
        if (d) return d;
        const c = row?.content ?? {};
        return {
            title: row?.title ?? "",
            body: str(c.body ?? c.text ?? ""),
            excerpt: str(c.excerpt ?? ""),
            meta_title: row?.meta_title ?? "",
            meta_description: row?.meta_description ?? "",
            cover_alt_text: row?.cover_alt_text ?? "",
            cta_label: row?.cta_label ?? "",
            cta_url: row?.cta_url ?? "",
            category_label: row?.category_label ?? "",
        };
    };

    const set = (locale: string, key: string, value: string) =>
        setDrafts((prev) => ({ ...prev, [locale]: { ...draftFor(locale, byLocale.get(locale)), [key]: value } }));

    const save = async (locale: string) => {
        const d = draftFor(locale, byLocale.get(locale));
        if (!d.title.trim()) {
            setError(`[${locale}] Title is required.`);
            return;
        }
        setBusy(`${locale}:save`);
        setError(null);
        setInfo(null);
        const res = await upsertPageTranslation(pageId, locale, {
            title: d.title.trim(),
            content: { ...(byLocale.get(locale)?.content ?? {}), body: d.body, excerpt: d.excerpt || undefined },
            meta_title: d.meta_title.trim() || null,
            meta_description: d.meta_description.trim() || null,
            cover_alt_text: d.cover_alt_text.trim() || null,
            cta_label: d.cta_label.trim() || null,
            cta_url: d.cta_url.trim() || null,
            category_label: d.category_label.trim() || null,
        });
        setBusy(null);
        if (res.error) setError(res.error);
        else {
            setInfo(`[${locale}] Saved as draft. Request review when ready.`);
            window.location.reload();
        }
    };

    const setStatus = async (locale: string, status: "draft" | "in_review" | "approved" | "published") => {
        setBusy(`${locale}:${status}`);
        setError(null);
        setInfo(null);
        const res = await setPageTranslationStatus(pageId, locale, status);
        setBusy(null);
        if (res.error) setError(res.error);
        else window.location.reload();
    };

    const requestAi = async (locale: string) => {
        setBusy(`${locale}:ai`);
        setError(null);
        setInfo(null);
        const res = await requestAiTranslation(pageId, locale);
        setBusy(null);
        if (res.error) setError(`[${locale}] ${res.error}`);
        else if (res.warning) setInfo(res.warning);
    };

    const exportAll = () => {
        const locales: Record<string, Record<string, unknown>> = {};
        for (const r of rows) {
            locales[r.locale] = {
                title: r.title,
                content: r.content,
                meta_title: r.meta_title,
                meta_description: r.meta_description,
                cover_alt_text: r.cover_alt_text,
                cta_label: r.cta_label,
                cta_url: r.cta_url,
                category_label: r.category_label,
            };
        }
        const blob = new Blob([JSON.stringify(exportTranslations(pageSlug, locales), null, 2)], {
            type: "application/json",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${pageSlug}.translations.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const importFile = async (file: File) => {
        setError(null);
        setInfo(null);
        try {
            const raw = JSON.parse(await file.text());
            const parsed = importTranslations(raw);
            if (!parsed.ok || !parsed.locales) {
                setError(parsed.error ?? "Invalid translation file.");
                return;
            }
            for (const [locale, payload] of Object.entries(parsed.locales)) {
                const p = payload as Record<string, unknown>;
                const inner =
                    p.content && typeof p.content === "object" && !Array.isArray(p.content)
                        ? (p.content as Record<string, unknown>)
                        : {};
                await upsertPageTranslation(pageId, locale, {
                    title: typeof p.title === "string" ? p.title : "",
                    content: { ...inner },
                    meta_title: typeof p.meta_title === "string" ? p.meta_title : null,
                    meta_description: typeof p.meta_description === "string" ? p.meta_description : null,
                    cover_alt_text: typeof p.cover_alt_text === "string" ? p.cover_alt_text : null,
                    cta_label: typeof p.cta_label === "string" ? p.cta_label : null,
                    cta_url: typeof p.cta_url === "string" ? p.cta_url : null,
                    category_label: typeof p.category_label === "string" ? p.category_label : null,
                });
            }
            setInfo("Imported translations saved as drafts — review each locale before approving.");
            window.location.reload();
        } catch {
            setError("Could not read that file. Expected a translation export JSON.");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Translations</CardTitle>
                <CardDescription>
                    One row per locale. Publishing a locale requires approval and complete required
                    fields — untranslated locales fall back to English on the public site.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>AI-generated text always requires human review before approval or publishing.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={exportAll}>
                        Export JSON
                    </Button>
                    <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                        Import JSON
                        <input
                            type="file"
                            accept="application/json"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) importFile(f);
                            }}
                        />
                    </label>
                </div>

                {SUPPORTED_LOCALES.map((locale) => {
                    const row = byLocale.get(locale);
                    const d = draftFor(locale, row);
                    const payload = {
                        title: d.title || row?.title || "",
                        body: d.body,
                        excerpt: d.excerpt,
                        meta_title: d.meta_title,
                        meta_description: d.meta_description,
                        cover_alt_text: d.cover_alt_text,
                        cta_label: d.cta_label,
                        cta_url: d.cta_url,
                        category_label: d.category_label,
                    };
                    const { completeness, missingFields } = translationCompleteness(payload);
                    const pct = Math.round(completeness * 100);
                    const isOpen = open === locale;
                    return (
                        <div key={locale} className="rounded-lg border">
                            <button
                                type="button"
                                className="flex w-full items-center justify-between gap-3 p-3 text-left"
                                onClick={() => setOpen(isOpen ? null : locale)}
                            >
                                <span className="flex items-center gap-2 text-sm font-semibold">
                                    {LOCALE_LABELS[locale]}
                                    <Badge variant={row?.status === "published" ? "default" : "secondary"} className="text-[11px]">
                                        {row?.status ?? "missing"}
                                    </Badge>
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {row ? `${pct}%${row.version ? ` · v${row.version}` : ""}` : "no translation yet"}
                                </span>
                            </button>
                            {isOpen && (
                                <div className="space-y-3 border-t p-3">
                                    {missingFields.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Missing: <span className="font-mono">{missingFields.join(", ")}</span>
                                        </p>
                                    )}
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title *</label>
                                            <Input value={d.title} onChange={(e) => set(locale, "title", e.target.value)} />
                                        </div>
                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Body</label>
                                            <Textarea value={d.body} onChange={(e) => set(locale, "body", e.target.value)} rows={4} />
                                        </div>
                                        <div className="space-y-1 sm:col-span-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Excerpt</label>
                                            <Textarea value={d.excerpt} onChange={(e) => set(locale, "excerpt", e.target.value)} rows={2} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta title</label>
                                            <Input value={d.meta_title} onChange={(e) => set(locale, "meta_title", e.target.value)} maxLength={200} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meta description</label>
                                            <Input value={d.meta_description} onChange={(e) => set(locale, "meta_description", e.target.value)} maxLength={500} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cover alt text</label>
                                            <Input value={d.cover_alt_text} onChange={(e) => set(locale, "cover_alt_text", e.target.value)} maxLength={300} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category label</label>
                                            <Input value={d.category_label} onChange={(e) => set(locale, "category_label", e.target.value)} maxLength={120} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CTA label</label>
                                            <Input value={d.cta_label} onChange={(e) => set(locale, "cta_label", e.target.value)} maxLength={120} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CTA URL</label>
                                            <Input value={d.cta_url} onChange={(e) => set(locale, "cta_url", e.target.value)} placeholder="https://… or /path" />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button size="sm" disabled={busy !== null} onClick={() => save(locale)}>
                                            {busy === `${locale}:save` ? "Saving…" : "Save translation"}
                                        </Button>
                                        <Button size="sm" variant="outline" disabled={busy !== null || !row} onClick={() => setStatus(locale, "in_review")}>
                                            Request review
                                        </Button>
                                        <Button size="sm" variant="outline" disabled={busy !== null || !row} onClick={() => setStatus(locale, "approved")}>
                                            Approve
                                        </Button>
                                        <Button size="sm" variant="outline" disabled={busy !== null || !row} onClick={() => setStatus(locale, "published")}>
                                            Publish locale
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="gap-1"
                                            disabled={busy !== null || !aiConfigured}
                                            title={aiConfigured ? "Generate a machine-translation draft (requires review)" : "AI translation is not configured"}
                                            onClick={() => requestAi(locale)}
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                            {busy === `${locale}:ai` ? "Working…" : aiConfigured ? "AI translate" : "AI (not configured)"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {error && <p className="text-sm text-red-500">{error}</p>}
                {info && <p className="text-sm text-emerald-600">{info}</p>}
            </CardContent>
        </Card>
    );
}
