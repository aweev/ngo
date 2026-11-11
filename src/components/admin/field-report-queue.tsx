"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    reviewFieldReport,
    promoteFieldReport,
} from "@/actions/field-reports";
import { CheckCircle2, FileText, XCircle } from "lucide-react";

/** Shape of one `field_reports` row as returned by getFieldReports. */
export type FieldReportRow = {
    id: string;
    raw_text: string;
    from_number: string;
    quantity: number | null;
    project_code: string;
    metric_code: string;
    metric_id: string | null;
    validation_state: string;
    validation_reason: string | null;
    received_at: string;
    promoted_measurement_id: string | null;
};

type MetricOption = { id: string; name: string };

const STATE_CLASS: Record<string, string> = {
    quarantined: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    pending_review: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    verified: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    promoted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

/**
 * Verification queue for WhatsApp/SMS field-report intake (Phase 1.3).
 * Reports land quarantined; a reviewer with impact.manage moves each one
 * forward (review → verify/reject) and promotes verified reports into impact
 * measurements via the idempotent promote_field_report() SQL function.
 */
export function FieldReportQueue({
    initialReports,
    metrics,
}: {
    initialReports: FieldReportRow[];
    metrics: MetricOption[];
}) {
    const t = useTranslations("Admin.Impact.fieldReports");
    const [rows, setRows] = useState(initialReports);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [reasons, setReasons] = useState<Record<string, string>>({});
    const [metricChoices, setMetricChoices] = useState<Record<string, string>>(
        Object.fromEntries(initialReports.filter((r) => r.metric_id).map((r) => [r.id, r.metric_id as string])),
    );

    const patch = (id: string, next: Partial<FieldReportRow>) =>
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));

    const review = async (row: FieldReportRow, state: "pending_review" | "verified" | "rejected") => {
        setBusy(`${row.id}:${state}`);
        setError(null);
        const res = await reviewFieldReport(row.id, {
            state,
            reason: reasons[row.id]?.trim() || null,
            metric_id: metricChoices[row.id] || null,
        });
        setBusy(null);
        if (res.error) {
            setError(res.error);
            return;
        }
        patch(row.id, { validation_state: state });
    };

    const promote = async (row: FieldReportRow) => {
        setBusy(`${row.id}:promote`);
        setError(null);
        const res = await promoteFieldReport(row.id);
        setBusy(null);
        if (res.error) {
            setError(res.error);
            return;
        }
        patch(row.id, {
            validation_state: "promoted",
            promoted_measurement_id: res.data?.measurement_id ?? null,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <FileText className="h-4 w-4" />
                    {t("title")}
                </CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("empty")}</p>}
                {rows.map((row) => {
                    const metricResolved = Boolean(metricChoices[row.id]);
                    const canPromote = row.validation_state === "verified" && metricResolved;
                    return (
                        <div key={row.id} className="rounded-lg border p-3 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary" className={`text-[11px] ${STATE_CLASS[row.validation_state] ?? ""}`}>
                                    {t(`state_${row.validation_state}`)}
                                </Badge>
                                <span className="font-mono text-[11px] text-muted-foreground">{row.from_number}</span>
                                <span className="text-[11px] text-muted-foreground">
                                    {new Date(row.received_at).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-sm">{row.raw_text}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                                <span>
                                    {t("quantity")}: {row.quantity ?? "—"}
                                </span>
                                <span>
                                    {t("project")}: <span className="font-mono">{row.project_code}</span>
                                </span>
                                <span>
                                    {t("metric")}: <span className="font-mono">{row.metric_code}</span>
                                </span>
                                {row.validation_reason && <span>— {row.validation_reason}</span>}
                            </div>
                            {row.validation_state !== "promoted" && (
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <select
                                        aria-label={t("metric")}
                                        value={metricChoices[row.id] ?? ""}
                                        onChange={(e) => setMetricChoices((p) => ({ ...p, [row.id]: e.target.value }))}
                                        className="h-8 rounded-md border bg-background px-2 text-xs"
                                    >
                                        <option value="">{t("metric_ph")}</option>
                                        {metrics.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name}
                                            </option>
                                        ))}
                                    </select>
                                    {row.validation_state === "quarantined" && (
                                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => review(row, "pending_review")}>
                                            {t("review")}
                                        </Button>
                                    )}
                                    {row.validation_state === "pending_review" && (
                                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => review(row, "verified")}>
                                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                            {t("verify")}
                                        </Button>
                                    )}
                                    {(row.validation_state === "quarantined" || row.validation_state === "pending_review") && (
                                        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => review(row, "rejected")}>
                                            <XCircle className="mr-1 h-3.5 w-3.5" />
                                            {t("reject")}
                                        </Button>
                                    )}
                                    {canPromote && (
                                        <Button size="sm" disabled={busy !== null} onClick={() => promote(row)}>
                                            {busy === `${row.id}:promote` ? t("working") : t("promote")}
                                        </Button>
                                    )}
                                </div>
                            )}
                            {(row.validation_state === "quarantined" || row.validation_state === "pending_review") && (
                                <Input
                                    value={reasons[row.id] ?? ""}
                                    placeholder={t("reason_ph")}
                                    onChange={(e) => setReasons((p) => ({ ...p, [row.id]: e.target.value }))}
                                    className="h-8 text-xs"
                                />
                            )}
                        </div>
                    );
                })}
                {error && <p className="text-sm text-red-500">{error}</p>}
            </CardContent>
        </Card>
    );
}
