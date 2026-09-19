export type JobType = 'report' | 'notification' | 'automation' | 'export' | 'sync' | 'custom';
export type ScheduleType = 'cron' | 'one_shot' | 'interval';
export type JobStatus = 'success' | 'failure' | 'skipped';

export interface ScheduledJob {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    job_type: JobType;
    schedule_type: ScheduleType;
    cron_expression: string | null;
    next_run_at: string | null;
    last_run_at: string | null;
    last_run_status: JobStatus | null;
    is_active: boolean;
    config: Record<string, unknown>;
    run_count: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface JobExecution {
    id: string;
    organization_id: string;
    job_id: string;
    status: 'running' | 'success' | 'failure' | 'skipped';
    started_at: string;
    completed_at: string | null;
    duration_ms: number | null;
    output: Record<string, unknown>;
    error_message: string | null;
    created_at: string;
}

export type ScheduledJobInsert = Omit<ScheduledJob, 'id' | 'run_count' | 'last_run_at' | 'last_run_status' | 'created_at' | 'updated_at'>;
export type ScheduledJobUpdate = Partial<ScheduledJobInsert>;
