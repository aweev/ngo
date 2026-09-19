export type AutomationTriggerType = 'schedule' | 'event' | 'condition' | 'webhook' | 'manual';
export type AutomationExecutionStatus = 'running' | 'success' | 'failure' | 'skipped';

export interface AutomationCondition {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty';
    value: unknown;
    logic?: 'and' | 'or';
}

export interface AutomationAction {
    type: 'send_notification' | 'send_email' | 'create_task' | 'update_field' | 'trigger_webhook' | 'start_workflow' | 'create_record' | 'custom';
    config: Record<string, unknown>;
    delay_seconds?: number;
}

export interface AutomationRule {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    is_enabled: boolean;
    trigger_type: AutomationTriggerType;
    trigger_config: Record<string, unknown>;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    run_count: number;
    last_run_at: string | null;
    last_run_status: AutomationExecutionStatus | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface AutomationExecution {
    id: string;
    organization_id: string;
    rule_id: string;
    status: AutomationExecutionStatus;
    trigger_data: Record<string, unknown>;
    results: Record<string, unknown>;
    error_message: string | null;
    started_at: string;
    completed_at: string | null;
    created_at: string;
}

export interface AutomationTemplate {
    id: string;
    organization_id: string | null;
    name: string;
    description: string | null;
    category: string | null;
    trigger_type: AutomationTriggerType;
    template_config: Record<string, unknown>;
    is_system: boolean;
    created_at: string;
    updated_at: string;
}

export type AutomationRuleInsert = Omit<AutomationRule, 'id' | 'run_count' | 'last_run_at' | 'last_run_status' | 'created_at' | 'updated_at'>;
export type AutomationRuleUpdate = Partial<AutomationRuleInsert>;
