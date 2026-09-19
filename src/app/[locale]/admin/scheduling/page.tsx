import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getScheduledJobs } from "@/actions/scheduling";
import { Plus, Clock } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function SchedulingPage() {
    const { data: jobs } = await getScheduledJobs();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Scheduler & Cron Jobs"
                description="Manage recurring scheduled tasks, automated exports, and timed triggers."
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/scheduling/new">
                            <Plus className="h-4 w-4" />
                            Schedule Job
                        </Link>
                    </Button>
                }
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Job Name</TableHead>
                            <TableHead>Schedule</TableHead>
                            <TableHead>Job Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Next Run</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!jobs || jobs.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                                    No scheduled jobs active. Click &quot;Schedule Job&quot; to set up timed automation.
                                </TableCell>
                            </TableRow>
                        ) : (
                            jobs.map((job) => (
                                <TableRow key={job.id}>
                                    <TableCell className="font-semibold text-sm">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-indigo-500 shrink-0" />
                                            <span>{job.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{job.cron_expression || job.schedule_type}</TableCell>
                                    <TableCell className="capitalize text-xs">{job.job_type}</TableCell>
                                    <TableCell>
                                        <Badge variant={job.is_active ? "default" : "secondary"}>
                                            {job.is_active ? "Active" : "Paused"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {job.next_run_at ? new Date(job.next_run_at).toLocaleString() : "N/A"}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
