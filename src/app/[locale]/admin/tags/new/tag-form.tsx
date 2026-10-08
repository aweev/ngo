"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { createTag } from "@/actions/tags";

function slugify(v: string): string {
    return v.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

const SWATCHES = ["#D95D39", "#F0A202", "#0E7C7B", "#2A9D8F", "#6366F1", "#EC4899", "#64748B"];

export function TagForm() {
    const router = useRouter();
    const t = useTranslations("Admin.Tags.form");
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [slugTouched, setSlugTouched] = useState(false);
    const [color, setColor] = useState(SWATCHES[0]);
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        const result = await createTag({
            name: name.trim(),
            slug: (slugTouched ? slug : slugify(name)).trim(),
            color,
            description: description.trim() || null,
        });
        if (result.data) {
            router.push("/admin/tags");
            router.refresh();
        } else {
            setError(result.error || t("error"));
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardContent className="p-6">
                <form onSubmit={submit} className="max-w-xl space-y-4">
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t("name_label")}</Label>
                            <Input
                                value={name}
                                onChange={(e) => { setName(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }}
                                placeholder={t("name_placeholder")}
                                maxLength={80}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("slug_label")}</Label>
                            <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="field-operations" maxLength={80} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{t("color_label")}</Label>
                        <div className="flex gap-2">
                            {SWATCHES.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setColor(s)}
                                    className={`h-8 w-8 rounded-full border-2 ${color === s ? "border-foreground" : "border-transparent"}`}
                                    style={{ backgroundColor: s }}
                                    aria-label={s}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{t("description_label")}</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
                    </div>
                    <Button type="submit" disabled={saving || name.trim().length < 2}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("save")}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
