export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending';

export interface Integration {
    id: string;
    organization_id: string;
    provider: string;
    name: string;
    status: IntegrationStatus;
    config: Record<string, unknown>;
    credentials_ref: string | null;
    last_synced_at: string | null;
    metadata: Record<string, unknown>;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface Webhook {
    id: string;
    organization_id: string;
    name: string;
    url: string;
    events: string[];
    secret_token: string | null;
    is_active: boolean;
    last_triggered_at: string | null;
    success_count: number;
    failure_count: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface WebhookDelivery {
    id: string;
    organization_id: string;
    webhook_id: string;
    event_type: string;
    payload: Record<string, unknown>;
    response_status: number | null;
    response_body: string | null;
    attempt_count: number;
    delivered_at: string | null;
    created_at: string;
}

export type IntegrationInsert = Omit<Integration, 'id' | 'last_synced_at' | 'created_at' | 'updated_at'>;
export type IntegrationUpdate = Partial<IntegrationInsert>;

export type WebhookInsert = Omit<Webhook, 'id' | 'last_triggered_at' | 'success_count' | 'failure_count' | 'created_at' | 'updated_at'>;
export type WebhookUpdate = Partial<WebhookInsert>;
