"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const JOB_TYPES: { value: JobType; label: string }[] = [
    { value: "report", label: "Report generation" },
    { value: "notification", label: "Notification dispatch" },
    { value: "automation", label: "Automation trigger" },
    { value: "export", label: "Data export" },
    { value: "sync", label: "Integration sync" },
    { value: "custom", label: "Custom job" },
];

export default function NewScheduledJobPage() {
    const router = useRouter();
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
            setError("A job name is required.");
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
                    <ArrowLeft className="h-4 w-4" /> Back to Scheduler
                </Link>
            </Button>
            <PageHeader title="Schedule Job" description="Configure a recurring task, export, or timed trigger." />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="h-4 w-4 text-indigo-500" /> Job details
                        </CardTitle>
                        <CardDescription>Name the job and pick what it should do.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-1">
                            <label htmlFor="job-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job name</label>
                            <Input id="job-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly donor digest" />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="job-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                            <Textarea id="job-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this job accomplish?" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job type</label>
                                <Select value={jobType} onValueChange={(v) => setJobType(v as JobType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {JOB_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schedule type</label>
                                <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as ScheduleType)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cron">Recurring (cron)</SelectItem>
                                        <SelectItem value="interval">Interval</SelectItem>
                                        <SelectItem value="one_shot">Run once</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {scheduleType === "cron" && <CronEditor value={cron} onChange={setCron} />}
                    </CardContent>
                </Card>
                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/scheduling">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? "Scheduling..." : "Schedule job"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
