export interface ImpactMetric {
    id: string;
    organization_id: string;
    name: string;
    slug: string;
    description: string | null;
    unit: string;
    category: string | null;
    current_value: number;
    target_value: number | null;
    baseline_value: number;
    is_public: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ImpactMeasurement {
    id: string;
    organization_id: string;
    metric_id: string;
    value: number;
    measured_at: string;
    notes: string | null;
    data_source: string | null;
    verified_by: string | null;
    created_at: string;
}

export interface ImpactGoal {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    target_date: string | null;
    status: 'on_track' | 'at_risk' | 'achieved' | 'missed';
    metrics: Record<string, unknown>[];
    project_id: string | null;
    created_at: string;
    updated_at: string;
}

export type ImpactMetricInsert = Omit<ImpactMetric, 'id' | 'current_value' | 'created_at' | 'updated_at'>;
export type ImpactMetricUpdate = Partial<ImpactMetricInsert>;
