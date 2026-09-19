export type WorkflowStatus = 'draft' | 'active' | 'archived';
export type WorkflowInstanceStatus = 'pending' | 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled';
export type WorkflowStepType = 'task' | 'approval' | 'condition' | 'notification' | 'action' | 'delay' | 'parallel';

export interface WorkflowStep {
    id: string;
    name: string;
    type: WorkflowStepType;
    config: Record<string, unknown>;
    assignee_type?: 'user' | 'role' | 'any';
    assignee_id?: string;
    due_in_hours?: number;
    step_index: number;
}

export interface WorkflowDefinition {
    id: string;
    organization_id: string;
    name: string;
    description: string | null;
    slug: string;
    status: WorkflowStatus;
    steps: WorkflowStep[];
    trigger_config: Record<string, unknown>;
    version: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface WorkflowStepHistory {
    step_index: number;
    step_name: string;
    status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
    started_at: string | null;
    completed_at: string | null;
    actor_id: string | null;
    result: Record<string, unknown> | null;
}

export interface WorkflowInstance {
    id: string;
    organization_id: string;
    definition_id: string;
    status: WorkflowInstanceStatus;
    current_step_index: number;
    context_data: Record<string, unknown>;
    step_history: WorkflowStepHistory[];
    started_at: string | null;
    completed_at: string | null;
    triggered_by: string | null;
    entity_type: string | null;
    entity_id: string | null;
    created_at: string;
    updated_at: string;
}

export type WorkflowDefinitionInsert = Omit<WorkflowDefinition, 'id' | 'version' | 'created_at' | 'updated_at'>;
export type WorkflowDefinitionUpdate = Partial<WorkflowDefinitionInsert>;
