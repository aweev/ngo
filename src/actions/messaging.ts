'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import type {
    Conversation,
    ConversationInsert,
    ConversationMessage,
} from '@/types/domain/messaging';

export async function getConversations(): Promise<{ data: Conversation[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.messaging.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('conversations')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) return { data: null, error: 'Unable to load conversations. Please try again.' };
    return { data: data as Conversation[], error: null };
}

export async function createConversation(
    input: Omit<ConversationInsert, 'organization_id' | 'created_by'>,
): Promise<{ data: Conversation | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.messaging.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('conversations')
        .insert({
            ...input,
            organization_id: auth.organizationId,
            created_by: auth.userId,
        })
        .select()
        .single();

    if (error) {
        console.error('[createConversation]', error.message);
        return { data: null, error: 'Unable to create the conversation. Please check the provided data.' };
    }

    revalidatePath('/admin/messaging');
    return { data: data as Conversation, error: null };
}

export async function getMessages(
    conversationId: string,
): Promise<{ data: ConversationMessage[] | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.messaging.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('conversation_messages')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

    if (error) return { data: null, error: 'Unable to load messages. Please try again.' };
    return { data: data as ConversationMessage[], error: null };
}

export async function sendMessage(
    conversationId: string,
    content: string,
): Promise<{ data: ConversationMessage | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.messaging.manage);
    if (!auth.ok) return { data: null, error: auth.error };
    if (!content.trim()) return { data: null, error: 'Message content is required.' };

    const { data: conversation } = await auth.context.supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!conversation) return { data: null, error: 'Conversation not found.' };

    const { data, error } = await auth.context.supabase
        .from('conversation_messages')
        .insert({
            organization_id: auth.organizationId,
            conversation_id: conversationId,
            sender_id: auth.userId,
            content: content.trim(),
            content_type: 'text',
            attachments: [],
        })
        .select()
        .single();

    if (error) {
        console.error('[sendMessage]', error.message);
        return { data: null, error: 'Unable to send the message. Please try again.' };
    }

    await auth.context.supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString(), last_message_preview: content.trim().slice(0, 200) })
        .eq('id', conversationId)
        .eq('organization_id', auth.organizationId);

    revalidatePath('/admin/messaging');
    return { data: data as ConversationMessage, error: null };
}
