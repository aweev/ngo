"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { createImpactMetric } from "@/actions/impact";

function slugify(v: string): string {
    return v.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function ImpactMetricForm() {
    const router = useRouter();
    const t = useTranslations("Admin.Impact.metricForm");
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [slugTouched, setSlugTouched] = useState(false);
    const [description, setDescription] = useState("");
    const [unit, setUnit] = useState("");
    const [category, setCategory] = useState("");
    const [target, setTarget] = useState("");
    const [baseline, setBaseline] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        const result = await createImpactMetric({
            name: name.trim(),
            slug: (slugTouched ? slug : slugify(name)).trim(),
            description: description.trim() || null,
            unit: unit.trim(),
            category: category.trim() || null,
            target_value: target.trim() === "" ? null : Number(target),
            baseline_value: baseline.trim() === "" ? 0 : Number(baseline),
            is_public: isPublic,
        });
        if (result.data) {
            router.push("/admin/impact");
            router.refresh();
        } else {
            setError(result.error || t("error"));
            setSaving(false);
        }
    };

    return (
        <Card>
            <CardContent className="p-6">
                <form onSubmit={submit} className="max-w-2xl space-y-4">
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
                                maxLength={120}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("slug_label")}</Label>
                            <Input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="lives-touched" maxLength={80} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{t("description_label")}</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <Label>{t("unit_label")}</Label>
                            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="people" maxLength={40} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("category_label")}</Label>
                            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="health" maxLength={60} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("baseline_label")}</Label>
                            <Input type="number" step="any" value={baseline} onChange={(e) => setBaseline(e.target.value)} placeholder="0" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{t("target_label")}</Label>
                        <Input type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="10000" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox id="public" checked={isPublic} onCheckedChange={(c) => setIsPublic(!!c)} />
                        <Label htmlFor="public" className="cursor-pointer">{t("public_label")}</Label>
                    </div>
                    <Button type="submit" disabled={saving || name.trim().length < 2 || unit.trim().length === 0}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("save")}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
