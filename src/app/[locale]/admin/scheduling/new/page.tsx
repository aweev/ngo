"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/manage/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CronEditor } from "@/components/admin/cron-editor";
import { createScheduledJob } from "@/actions/scheduling";
import type { JobType, ScheduleType } from "@/types/domain/scheduling";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import { Link } from "@/lib/navigation";

const JOB_TYPE_KEYS: { value: JobType; labelKey: string }[] = [
    { value: "report", labelKey: "type_report" },
    { value: "notification", labelKey: "type_notification" },
    { value: "automation", labelKey: "type_automation" },
    { value: "export", labelKey: "type_export" },
    { value: "sync", labelKey: "type_sync" },
    { value: "custom", labelKey: "type_custom" },
];

export default function NewScheduledJobPage() {
    const router = useRouter();
    const t = useTranslations("Admin.Scheduling");
    const tCommon = useTranslations("Admin.Common");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [jobType, setJobType] = useState<JobType>("report");
    const [scheduleType, setScheduleType] = useState<ScheduleType>("cron");
    const [cron, setCron] = useState("0 9 * * *");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!name.trim()) {
            setError(t("name_required"));
            return;
        }
        setLoading(true);
        setError(null);
        const result = await createScheduledJob({
            name: name.trim(),
            description: description.trim() || null,
            job_type: jobType,
            schedule_type: scheduleType,
            cron_expression: scheduleType === "cron" ? cron : null,
            next_run_at: null,
            is_active: true,
            config: {},
            created_by: null,
        });
        setLoading(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        router.push("/admin/scheduling");
    }

    return (
        <div className="max-w-3xl space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/scheduling">
                    <ArrowLeft className="h-4 w-4" /> {t("back_to_scheduler")}
                </Link>
            </Button>
            <PageHeader title={t("new_title")} description={t("new_description")} />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="h-4 w-4 text-indigo-500" /> {t("details_title")}
                        </CardTitle>
                        <CardDescription>{t("details_description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-1">
                            <label htmlFor="job-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("job_name")}</label>
                            <Input id="job-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("job_name_placeholder")} />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="job-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("description_label")}</label>
                            <Textarea id="job-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("description_placeholder")} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("job_type")}</label>
                                <Select value={jobType} onValueChange={(v) => setJobType(v as JobType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {JOB_TYPE_KEYS.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>{t(item.labelKey)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("schedule_type")}</label>
                                <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cron">{t("schedule_cron")}</SelectItem>
                                        <SelectItem value="interval">{t("schedule_interval")}</SelectItem>
                                        <SelectItem value="one_shot">{t("schedule_one_shot")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {scheduleType === "cron" && <CronEditor value={cron} onChange={setCron} />}
                    </CardContent>
                </Card>
                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/scheduling">{tCommon("cancel")}</Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? t("scheduling") : t("submit")}
                    </Button>
                </div>
            </form>
        </div>
    );
}
