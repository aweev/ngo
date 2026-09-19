export interface ReportDefinition {
    id: string;
    organization_id: string;
    name: string;
    slug: string;
    description: string | null;
    entity_type: string;
    filters: Record<string, unknown>;
    grouping: string[];
    metrics: string[];
    sort_field: string | null;
    sort_direction: 'asc' | 'desc';
    schedule_job_id: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ReportSnapshot {
    id: string;
    organization_id: string;
    report_id: string;
    name: string | null;
    row_count: number;
    data: Record<string, unknown>[];
    generated_at: string;
    generated_by: string | null;
    expires_at: string | null;
    created_at: string;
}

export type ReportDefinitionInsert = Omit<ReportDefinition, 'id' | 'created_at' | 'updated_at'>;
export type ReportDefinitionUpdate = Partial<ReportDefinitionInsert>;
