"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    getEntityTranslations,
    upsertEntityTranslation,
    setEntityTranslationStatus,
    requestEntityAiTranslation,
} from "@/actions/entity-translations";
import { SUPPORTED_LOCALES, LOCALE_LABELS, type SupportedLocale } from "@/lib/i18n/locales";
import type { EntityTranslationField } from "@/lib/content/entity-translations";
import { ChevronDown, ChevronRight, Languages, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

/** Shape of one `entity_translations` row as returned by getEntityTranslations. */
export type EntityTranslationRow = {
    locale: string;
    status: string;
    fields: Record<string, unknown>;
    version: number;
    updated_at: string;
};

function str(v: unknown): string {
    return typeof v === "string" ? v : "";
}

function draftFrom(row: EntityTranslationRow | undefined, fields: readonly EntityTranslationField[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const f of fields) out[f.key] = str(row?.fields?.[f.key]);
    return out;
}

/**
 * Reusable per-entity translation editor.
 *
 * One panel manages every supported locale for a single entity (campaign,
 * project, partner, impact metric, event, organization profile, …): edit the
 * translatable display fields, move each locale draft -> in_review -> approved
 * -> published, and optionally machine-translate from the English source.
 *
 * The collapsed header paints coverage from the `coverage` prop (one batch
 * query on the server); the full rows are lazy-loaded the first time the panel
 * is expanded. Every mutation goes through the guarded server actions in
 * `@/actions/entity-translations`, so permissions and the publish gate are
 * enforced server-side regardless of what the UI offers.
 */
export default function EntityTranslationsPanel({
    entityType,
    entityId,
    entityLabel,
    entitySubtitle,
    fields,
    displayFieldKey,
    coverage = {},
    aiConfigured,
}: {
    entityType: string;
    entityId: string;
    entityLabel: string;
    entitySubtitle?: string | null;
    fields: readonly EntityTranslationField[];
    displayFieldKey: string;
    coverage?: Record<string, string>;
    aiConfigured: boolean;
}) {
    const t = useTranslations("Admin.Content.Entities");
    const tFields = useTranslations("Admin.Content.Entities.fields");
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [rows, setRows] = useState<EntityTranslationRow[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [openLocale, setOpenLocale] = useState<SupportedLocale | null>(null);
    const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});

    const byLocale = new Map((rows ?? []).map((r) => [r.locale, r]));

    const load = async () => {
        setLoading(true);
        const res = await getEntityTranslations(entityType, entityId);
        setLoading(false);
        if (res.error) {
            setError(res.error);
            return;
        }
        setRows((res.data ?? []) as EntityTranslationRow[]);
    };

    const refresh = async () => {
        await load();
        router.refresh();
    };

    const toggle = async () => {
        if (open) {
            setOpen(false);
            return;
        }
        setOpen(true);
        setError(null);
        if (rows === null) await load();
    };

    const draftFor = (locale: string): Record<string, string> =>
        drafts[locale] ?? draftFrom(byLocale.get(locale), fields);

    const set = (locale: string, key: string, value: string) =>
        setDrafts((prev) => ({ ...prev, [locale]: { ...draftFor(locale), [key]: value } }));

    const save = async (locale: string) => {
        const d = draftFor(locale);
        if (!d[displayFieldKey]?.trim()) {
            setError(t("title_required", { locale }));
            return;
        }
        setBusy(`${locale}:save`);
        setError(null);
        setInfo(null);
        const res = await upsertEntityTranslation(entityType, entityId, locale, d);
        setBusy(null);
        if (res.error) {
            setError(res.error);
            return;
        }
        setDrafts((prev) => {
            const next = { ...prev };
            delete next[locale];
            return next;
        });
        setInfo(t("saved_draft", { locale }));
        await refresh();
    };

    const setStatus = async (locale: string, status: "in_review" | "approved" | "published") => {
        setBusy(`${locale}:${status}`);
        setError(null);
        setInfo(null);
        const res = await setEntityTranslationStatus(entityType, entityId, locale, status);
        setBusy(null);
        if (res.error) setError(res.error);
        else await refresh();
    };

    const requestAi = async (locale: string) => {
        const source = byLocale.get("en");
        if (!source) {
            setError(t("ai_needs_source"));
            return;
        }
        setBusy(`${locale}:ai`);
        setError(null);
        setInfo(null);
        const res = await requestEntityAiTranslation(entityType, entityId, locale, source.fields ?? {});
        setBusy(null);
        if (res.error) setError(`[${locale}] ${res.error}`);
        else if (res.warning) setInfo(res.warning);
        await refresh();
    };

    const translatedCount = SUPPORTED_LOCALES.filter((l) => {
        const status = byLocale.get(l)?.status ?? coverage[l];
        return typeof status === "string" && status !== "missing";
    }).length;

    return (
        <Card>
            <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                title={t("manage")}
                className="flex w-full items-center gap-3 p-3 text-left"
            >
                {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                <Languages className="h-4 w-4 shrink-0 text-purple-500" />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{entityLabel}</span>
                    {entitySubtitle ? (
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">{entitySubtitle}</span>
                    ) : null}
                </span>
                <span className="hidden shrink-0 items-center gap-1 sm:flex">
                    {SUPPORTED_LOCALES.map((locale) => {
                        const status = byLocale.get(locale)?.status ?? coverage[locale] ?? "missing";
                        const done = status !== "missing";
                        const cls = !done
                            ? "bg-muted text-muted-foreground"
                            : status === "published"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
                        return (
                            <span
                                key={locale}
                                title={`${locale}: ${status}`}
                                className={`inline-block rounded px-1 py-0.5 font-mono text-[10px] leading-none ${cls}`}
                            >
                                {LOCALE_LABELS[locale].slice(0, 2)}
                            </span>
                        );
                    })}
                    <span className="text-[11px] text-muted-foreground">
                        {translatedCount}/{SUPPORTED_LOCALES.length}
                    </span>
                </span>
            </button>

            {open && (
                <CardContent className="space-y-3 border-t pt-3">
                    {loading && <p className="text-xs text-muted-foreground">{t("loading")}</p>}
                    {rows !== null && (
                        <div className="space-y-2">
                            {SUPPORTED_LOCALES.map((locale) => {
                                const row = byLocale.get(locale);
                                const status = row?.status ?? "missing";
                                const d = draftFor(locale);
                                const isOpen = openLocale === locale;
                                return (
                                    <div key={locale} className="rounded-md border">
                                        <button
                                            type="button"
                                            onClick={() => setOpenLocale(isOpen ? null : locale)}
                                            aria-expanded={isOpen}
                                            className="flex w-full items-center gap-2 p-2 text-left"
                                        >
                                            <span className="w-24 text-sm font-medium">{LOCALE_LABELS[locale]}</span>
                                            <Badge variant={status === "published" ? "default" : "secondary"} className="text-[11px]">
                                                {status}
                                            </Badge>
                                            <span className="flex-1 text-[11px] text-muted-foreground">
                                                {row ? t("version", { version: row.version }) : t("no_translation")}
                                            </span>
                                            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                        </button>
                                        {isOpen && (
                                            <div className="space-y-3 border-t p-3">
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {fields.map((f) => (
                                                        <div key={f.key} className={f.multiline ? "space-y-1 sm:col-span-2" : "space-y-1"}>
                                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                                {tFields(f.key)}
                                                            </label>
                                                            {f.multiline ? (
                                                                <Textarea
                                                                    value={d[f.key] ?? ""}
                                                                    rows={3}
                                                                    onChange={(e) => set(locale, f.key, e.target.value)}
                                                                />
                                                            ) : (
                                                                <Input
                                                                    value={d[f.key] ?? ""}
                                                                    onChange={(e) => set(locale, f.key, e.target.value)}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button size="sm" disabled={busy !== null} onClick={() => save(locale)}>
                                                        {busy === `${locale}:save` ? t("saving") : t("save")}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={busy !== null || !row}
                                                        onClick={() => setStatus(locale, "in_review")}
                                                    >
                                                        {t("request_review")}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={busy !== null || !row}
                                                        onClick={() => setStatus(locale, "approved")}
                                                    >
                                                        {t("approve")}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={busy !== null || !row}
                                                        onClick={() => setStatus(locale, "published")}
                                                    >
                                                        {t("publish")}
                                                    </Button>
                                                    {locale !== "en" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="gap-1"
                                                            disabled={busy !== null || !aiConfigured}
                                                            title={aiConfigured ? t("ai_tooltip_enabled") : t("ai_tooltip_disabled")}
                                                            onClick={() => requestAi(locale)}
                                                        >
                                                            <Sparkles className="h-3.5 w-3.5" />
                                                            {busy === `${locale}:ai`
                                                                ? t("ai_working")
                                                                : aiConfigured
                                                                  ? t("ai_translate")
                                                                  : t("ai_not_configured")}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    {info && <p className="text-sm text-emerald-600">{info}</p>}
                </CardContent>
            )}
        </Card>
    );
}
