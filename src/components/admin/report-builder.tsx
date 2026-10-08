"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

/**
 * Controlled report-definition editor (value/onChange), matching the
 * CronEditor / PermissionMatrix component conventions.
 *
 * The parent page owns persistence (createReport / updateReport); this
 * component only edits the draft shape.
 */
export interface ReportDraft {
    name: string;
    slug: string;
    description: string;
    entity_type: string;
    filters: Record<string, unknown>;
    grouping: string[];
    metrics: string[];
    sort_field: string | null;
    sort_direction: "asc" | "desc";
}

interface ReportBuilderProps {
    value: ReportDraft;
    onChange: (draft: ReportDraft) => void;
}



/** Suggested metric columns per data source (kept intentionally simple). */
const METRIC_SUGGESTIONS: Record<string, string[]> = {
    donations: ["amount", "donor_id", "status", "created_at"],
    donors: ["total_donated", "status", "created_at"],
    workers: ["status", "department", "created_at"],
    volunteers: ["status", "hours_total", "created_at"],
    partners: ["status", "partnership_type", "created_at"],
    projects: ["status", "budget", "progress", "created_at"],
    campaigns: ["goal_amount", "raised_amount", "status", "created_at"],
    org_events: ["registered_count", "status", "start_date"],
    expenses: ["amount", "status", "category", "created_at"],
    impact_metrics: ["value", "category", "created_at"],
};

const GROUPABLE_SUGGESTIONS: Record<string, string[]> = {
    donations: ["status", "payment_method", "donor_id"],
    donors: ["status", "donor_type"],
    workers: ["department", "status"],
    volunteers: ["status", "availability"],
    partners: ["partnership_type", "status"],
    projects: ["status", "category", "country"],
    campaigns: ["status", "category"],
    org_events: ["type", "status", "city"],
    expenses: ["category", "status", "budget_id"],
    impact_metrics: ["category", "frequency"],
};

function slugify(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ReportBuilder({ value, onChange }: ReportBuilderProps) {
    const t = useTranslations("Admin.Reporting.builder");

    /** Data sources mirrored from REPORTABLE_TABLES in actions/reporting.ts. */
    const ENTITY_OPTIONS = [
        { value: "donations", label: t("ent_donations") },
        { value: "donors", label: t("ent_donors") },
        { value: "workers", label: t("ent_workers") },
        { value: "volunteers", label: t("ent_volunteers") },
        { value: "partners", label: t("ent_partners") },
        { value: "projects", label: t("ent_projects") },
        { value: "campaigns", label: t("ent_campaigns") },
        { value: "org_events", label: t("ent_events") },
        { value: "expenses", label: t("ent_expenses") },
        { value: "impact_metrics", label: t("ent_impact") },
    ];
    const [filterKey, setFilterKey] = useState("");
    const [filterValue, setFilterValue] = useState("");
    const [groupingInput, groupingSetInput] = useState("");

    const patch = (partial: Partial<ReportDraft>) => onChange({ ...value, ...partial });

    const addFilter = () => {
        const key = filterKey.trim();
        if (!key) return;
        patch({ filters: { ...value.filters, [key]: filterValue.trim() } });
        setFilterKey("");
        setFilterValue("");
    };

    const removeFilter = (key: string) => {
        const next = { ...value.filters };
        delete next[key];
        patch({ filters: next });
    };

    const addGrouping = (raw: string) => {
        const g = raw.trim();
        if (!g || value.grouping.includes(g)) return;
        patch({ grouping: [...value.grouping, g] });
        groupingSetInput("");
    };

    const toggleMetric = (metric: string) => {
        const has = value.metrics.includes(metric);
        patch({
            metrics: has ? value.metrics.filter((m) => m !== metric) : [...value.metrics, metric],
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t("def_title")}</CardTitle>
                <CardDescription>{t("def_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("name_label")}</label>
                        <Input
                            value={value.name}
                            onChange={(e) => patch({ name: e.target.value, slug: value.slug || slugify(e.target.value) })}
                            placeholder={t("name_ph")}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("slug_label")}</label>
                        <Input
                            value={value.slug}
                            onChange={(e) => patch({ slug: slugify(e.target.value) })}
                            placeholder="monthly-volunteer-activity"
                            className="font-mono text-sm"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("source_label")}</label>
                    <Select value={value.entity_type} onValueChange={(v) => patch({ entity_type: v, grouping: [], metrics: [] })}>
                        <SelectTrigger>
                            <SelectValue placeholder={t("source_ph")} />
                        </SelectTrigger>
                        <SelectContent>
                            {ENTITY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                    <Textarea
                        value={value.description}
                        onChange={(e) => patch({ description: e.target.value })}
                        placeholder={t("description_ph")}
                    />
                </div>

                {/* Filters */}
                <div className="space-y-2 rounded-lg border p-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("filters_label")}</label>
                    {Object.entries(value.filters).length === 0 && (
                        <p className="text-xs text-muted-foreground">{t("filters_empty")}</p>
                    )}
                    {Object.entries(value.filters).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-mono">
                                {key} = {String(val)}
                            </span>
                            <Button type="button" variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => removeFilter(key)}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                    <div className="flex items-end gap-2">
                        <div className="w-40 space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("field_label")}</label>
                            <Input value={filterKey} onChange={(e) => setFilterKey(e.target.value)} placeholder={t("field_ph")} className="h-9 font-mono text-xs" />
                        </div>
                        <div className="w-40 space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("equals_label")}</label>
                            <Input value={filterValue} onChange={(e) => setFilterValue(e.target.value)} placeholder={t("equals_ph")} className="h-9 font-mono text-xs" />
                        </div>
                        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addFilter}>
                            <Plus className="h-3 w-3" /> Add
                        </Button>
                    </div>
                </div>

                {/* Grouping */}
                <div className="space-y-2 rounded-lg border p-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("grouping_label")}</label>
                    <div className="flex flex-wrap gap-1">
                        {value.grouping.map((g) => (
                            <Button
                                key={g}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 font-mono text-xs"
                                onClick={() => patch({ grouping: value.grouping.filter((x) => x !== g) })}
                            >
                                {g} <Trash2 className="h-3 w-3" />
                            </Button>
                        ))}
                        {value.grouping.length === 0 && <p className="text-xs text-muted-foreground">{t("grouping_empty")}</p>}
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="w-48 space-y-1">
                            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("group_by_label")}</label>
                            <Input value={groupingInput} onChange={(e) => groupingSetInput(e.target.value)} placeholder="category" className="h-9 font-mono text-xs" />
                        </div>
                        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => addGrouping(groupingInput)}>
                            <Plus className="h-3 w-3" /> Add
                        </Button>
                        {(GROUPABLE_SUGGESTIONS[value.entity_type] ?? []).map((suggestion) => (
                            <Button
                                key={suggestion}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 font-mono text-xs text-muted-foreground"
                                onClick={() => addGrouping(suggestion)}
                            >
                                {suggestion}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Metrics */}
                <div className="space-y-2 rounded-lg border p-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("metrics_label")}</label>
                    <div className="flex flex-wrap gap-1">
                        {value.metrics.length === 0 && <p className="text-xs text-muted-foreground">{t("metrics_empty")}</p>}
                        {value.metrics.map((m) => (
                            <Button
                                key={m}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 font-mono text-xs"
                                onClick={() => toggleMetric(m)}
                            >
                                {m} <Trash2 className="h-3 w-3" />
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {(METRIC_SUGGESTIONS[value.entity_type] ?? []).map((suggestion) => (
                            <Button
                                key={suggestion}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 font-mono text-xs text-muted-foreground"
                                onClick={() => toggleMetric(suggestion)}
                            >
                                <Plus className="mr-1 h-3 w-3" /> {suggestion}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Sorting */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sort_field_label")}</label>
                        <Input
                            value={value.sort_field ?? ""}
                            onChange={(e) => patch({ sort_field: e.target.value.trim() || null })}
                            placeholder="created_at"
                            className="font-mono text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("sort_dir_label")}</label>
                        <Select value={value.sort_direction} onValueChange={(v) => patch({ sort_direction: v as "asc" | "desc" })}>
                            <SelectTrigger className="w-36">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="asc">{t("sort_asc")}</SelectItem>
                                <SelectItem value="desc">{t("sort_desc")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>


            </CardContent>
        </Card>
    );

}

