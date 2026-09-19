export type ConversationType = 'direct' | 'group' | 'broadcast';

export interface Conversation {
    id: string;
    organization_id: string;
    title: string | null;
    type: ConversationType;
    participant_ids: string[];
    last_message_at: string | null;
    last_message_preview: string | null;
    is_archived: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ConversationMessage {
    id: string;
    organization_id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    content_type: 'text' | 'html' | 'markdown';
    attachments: Record<string, unknown>[];
    read_by: string[];
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
}

export type ConversationInsert = Omit<Conversation, 'id' | 'last_message_at' | 'last_message_preview' | 'created_at' | 'updated_at'>;
export type ConversationMessageInsert = Omit<ConversationMessage, 'id' | 'read_by' | 'is_deleted' | 'created_at' | 'updated_at'>;
