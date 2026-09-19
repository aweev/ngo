"use client";

import { useState } from "react";
import { Loader2, Plus, Save, WandSparkles } from "lucide-react";
import { ensurePortalExperienceDefaults, savePortalExperienceItem } from "@/actions/portal-experience";
import type { PortalExperienceInput, PortalExperienceItem } from "@/types/domain/portal-experience";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n/locales";

const emptyItem: PortalExperienceInput = {
    kind: "onboarding_option",
    item_key: "new-option",
    label: "",
    description: null,
    value: null,
    icon: null,
    metadata: { group: "skills", roles: ["volunteer"] },
    translations: {},
    sort_order: 100,
    is_enabled: true,
};

export function PortalExperienceEditor({ initialItems }: { initialItems: PortalExperienceItem[] }) {
    const [items, setItems] = useState(initialItems);
    const [editing, setEditing] = useState<string | null>(null);
    const [draft, setDraft] = useState<PortalExperienceInput | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [locale, setLocale] = useState<SupportedLocale>("en");

    const edit = (item: PortalExperienceItem) => {
        setEditing(item.id);
        setDraft({ ...item, translations: item.translations ?? {}, metadata: item.metadata ?? {} });
        setMessage("");
    };

    const save = async () => {
        if (!draft) return;
        setLoading(true);
        const result = await savePortalExperienceItem(editing === "new" ? null : editing, draft);
        if (result.data) {
            setItems((current) => editing === "new" ? [...current, result.data!] : current.map((item) => item.id === result.data!.id ? result.data! : item));
            setEditing(null);
            setDraft(null);
            setMessage("Saved. Public auth and onboarding surfaces will use this content.");
        } else setMessage(result.error || "Unable to save.");
        setLoading(false);
    };

    const seed = async () => {
        setLoading(true);
        const result = await ensurePortalExperienceDefaults();
        setMessage(result.success ? "Defaults created. Refresh this page to edit them." : result.error || "Unable to create defaults.");
        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={seed} disabled={loading}><WandSparkles />Create missing defaults</Button>
                <Button size="sm" onClick={() => { setEditing("new"); setDraft(emptyItem); }}><Plus />Add item</Button>
            </div>
            <p className="text-xs text-muted-foreground">Manage auth testimonials, auth stats, and onboarding choices here. Empty configurations fall back to the translation catalog.</p>
            {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
            {editing && draft && (
                <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2">
                    <Input value={draft.item_key} onChange={(event) => setDraft({ ...draft, item_key: event.target.value })} placeholder="Stable key" />
                    <select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as PortalExperienceInput["kind"] })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="auth_testimonial">Auth testimonial</option><option value="auth_stat">Auth stat</option><option value="onboarding_option">Onboarding option</option></select>
                    <Input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="English label" />
                    <Input value={draft.value || ""} onChange={(event) => setDraft({ ...draft, value: event.target.value })} placeholder="Value / stat number" />
                    <Input value={draft.description || ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Description or author" />
                    {draft.kind === "auth_testimonial" && <Input value={String(draft.metadata.author || "")} onChange={(event) => setDraft({ ...draft, metadata: { ...draft.metadata, author: event.target.value } })} placeholder="Testimonial author" />}
                    {draft.kind === "onboarding_option" && <select value={String(draft.metadata.group || "skills")} onChange={(event) => setDraft({ ...draft, metadata: { ...draft.metadata, group: event.target.value as "role" | "skills" | "availability" | "causes" } })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="role">Role choice</option><option value="skills">Volunteer skills</option><option value="availability">Availability</option><option value="causes">Donor causes</option></select>}
                    <select value={locale} onChange={(event) => setLocale(event.target.value as SupportedLocale)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{SUPPORTED_LOCALES.map((code) => <option key={code} value={code}>{code.toUpperCase()} localized text</option>)}</select>
                    <Input value={draft.translations[locale]?.label || ""} onChange={(event) => setDraft({ ...draft, translations: { ...draft.translations, [locale]: { ...draft.translations[locale], label: event.target.value } } })} placeholder={`${locale.toUpperCase()} label override`} />
                    <Input value={draft.translations[locale]?.description || ""} onChange={(event) => setDraft({ ...draft, translations: { ...draft.translations, [locale]: { ...draft.translations[locale], description: event.target.value } } })} placeholder={`${locale.toUpperCase()} description / author`} />
                    <Input value={String(draft.sort_order)} type="number" onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })} placeholder="Sort order" />
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_enabled} onChange={(event) => setDraft({ ...draft, is_enabled: event.target.checked })} /> Published on the portal</label>
                    <div className="flex gap-2 sm:col-span-2"><Button onClick={save} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Save />}Save</Button><Button variant="ghost" onClick={() => { setEditing(null); setDraft(null); }}>Cancel</Button></div>
                </div>
            )}
            <div className="divide-y rounded-lg border">
                {items.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No portal configuration exists yet. Create the defaults to begin editing.</p> : items.map((item) => <button key={item.id} type="button" onClick={() => edit(item)} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/40"><span className="min-w-0"><span className="block truncate text-sm font-medium">{item.label}</span><span className="block text-xs text-muted-foreground">{item.kind} · {item.item_key}</span></span><span className="shrink-0 text-xs text-muted-foreground">{item.value || "Edit"}</span></button>)}
            </div>
        </div>
    );
}