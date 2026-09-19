export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'webhook';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

export interface NotificationTemplate {
    id: string;
    organization_id: string | null;
    name: string;
    slug: string;
    description: string | null;
    channel: NotificationChannel;
    subject: string | null;
    body: string;
    variables: string[];
    is_system: boolean;
    created_at: string;
    updated_at: string;
}

export interface Notification {
    id: string;
    organization_id: string;
    recipient_id: string | null;
    recipient_email: string | null;
    template_id: string | null;
    channel: NotificationChannel;
    subject: string | null;
    body: string;
    status: NotificationStatus;
    entity_type: string | null;
    entity_id: string | null;
    read_at: string | null;
    sent_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface NotificationPreferences {
    id: string;
    organization_id: string;
    user_id: string;
    email_enabled: boolean;
    sms_enabled: boolean;
    push_enabled: boolean;
    in_app_enabled: boolean;
    digest_frequency: 'immediate' | 'daily' | 'weekly';
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
    created_at: string;
    updated_at: string;
}

export type NotificationTemplateInsert = Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at'>;
export type NotificationTemplateUpdate = Partial<NotificationTemplateInsert>;
