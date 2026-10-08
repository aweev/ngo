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
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { createPerformanceReview } from "@/actions/governance";
import type { ReviewSubjectType } from "@/types/domain/governance";

interface SubjectOption {
    id: string;
    label: string;
}

export function ReviewForm({ subjects }: { subjects: Record<ReviewSubjectType, SubjectOption[]> }) {
    const router = useRouter();
    const t = useTranslations("Admin.Reviews.New.Form");
    const [subjectType, setSubjectType] = useState<ReviewSubjectType>("worker");
    const [subjectId, setSubjectId] = useState("");
    const [title, setTitle] = useState("");
    const [rating, setRating] = useState(3);
    const [reviewPeriod, setReviewPeriod] = useState("");
    const [strengths, setStrengths] = useState("");
    const [growth, setGrowth] = useState("");
    const [notes, setNotes] = useState("");
    const [isPrivate, setIsPrivate] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const splitLines = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);
    const options = subjects[subjectType] ?? [];

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        const result = await createPerformanceReview({
            subject_type: subjectType,
            subject_id: subjectId,
            title,
            rating,
            review_period: reviewPeriod || null,
            strengths: splitLines(strengths),
            areas_for_growth: splitLines(growth),
            feedback_notes: notes,
            is_private: isPrivate,
        });
        if (result.data) {
            router.push("/admin/reviews");
            router.refresh();
        } else {
            setError(result.error || t("save_failed"));
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
                            <Label>{t("type_label")}</Label>
                            <Select
                                value={subjectType}
                                onValueChange={(v) => { setSubjectType(v as ReviewSubjectType); setSubjectId(""); }}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="worker">{t("worker_opt")}</SelectItem>
                                    <SelectItem value="volunteer">{t("volunteer_opt")}</SelectItem>
                                    <SelectItem value="partner">{t("partner_opt")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t("target_label")}</Label>
                            <Select value={subjectId} onValueChange={setSubjectId}>
                                <SelectTrigger><SelectValue placeholder={t("select_placeholder")} /></SelectTrigger>
                                <SelectContent>
                                    {options.length === 0 && <SelectItem value="" disabled>No {subjectType}s found</SelectItem>}
                                    {options.map((o) => (
                                        <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t("title_label")}</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("title_placeholder")} maxLength={160} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t("period_label")}</Label>
                            <Input value={reviewPeriod} onChange={(e) => setReviewPeriod(e.target.value)} placeholder="2026-Q1" maxLength={40} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Rating: {rating} / 5</Label>
                        <Input type="range" min={1} max={5} step={1} value={rating} onChange={(e) => setRating(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("strengths_label")}</Label>
                        <Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={3} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("growth_label")}</Label>
                        <Textarea value={growth} onChange={(e) => setGrowth(e.target.value)} rows={3} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t("notes_label")}</Label>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox id="private" checked={isPrivate} onCheckedChange={(c) => setIsPrivate(!!c)} />
                        <Label htmlFor="private" className="cursor-pointer">{t("private_label")}</Label>
                    </div>
                    <Button type="submit" disabled={saving || !subjectId || title.trim().length < 2}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("save")}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
