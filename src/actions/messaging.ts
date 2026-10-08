'use server';

import { revalidatePath } from 'next/cache';
import { authorizePermission } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';
import { enqueueOutboxEvent } from '@/lib/reliability';
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

/** Whether the caller may post (composer visibility without a round-trip error). */
export async function canSendMessages(): Promise<boolean> {
    const auth = await authorizePermission(PERMISSIONS.messaging.manage);
    return auth.ok;
}

export interface ThreadPerson {
    userId: string;
    name: string | null;
    email: string | null;
}

/**
 * Display names for everyone visible in a thread (participants + senders).
 * Resolved service-side (auth.users is invisible to RLS callers) — gated by
 * messaging.read and strictly scoped to the thread's user ids, so no
 * directory enumeration is possible.
 */
export async function getThreadPeople(
    conversationId: string,
): Promise<{ data: ThreadPerson[]; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.messaging.read);
    if (!auth.ok) return { data: [], error: auth.error };

    const [{ data: conv }, { data: msgs }] = await Promise.all([
        auth.context.supabase
            .from('conversations')
            .select('participant_ids')
            .eq('id', conversationId)
            .eq('organization_id', auth.organizationId)
            .maybeSingle(),
        auth.context.supabase
            .from('conversation_messages')
            .select('sender_id')
            .eq('conversation_id', conversationId)
            .eq('organization_id', auth.organizationId)
            .limit(200),
    ]);
    if (!conv) return { data: [], error: 'Conversation not found.' };

    const ids = new Set<string>();
    for (const id of ((conv.participant_ids as unknown[]) ?? [])) {
        if (typeof id === 'string') ids.add(id);
    }
    for (const m of (msgs ?? [])) {
        const sid = (m as { sender_id?: unknown }).sender_id;
        if (typeof sid === 'string') ids.add(sid);
    }
    if (ids.size === 0) return { data: [], error: null };

    const admin = createSupabaseAdminClient();
    const people: ThreadPerson[] = [];
    let page = 1;
    for (;;) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error || !data?.users?.length) break;
        for (const u of data.users) {
            if (!ids.has(u.id)) continue;
            const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
            const full = typeof meta.full_name === 'string' ? meta.full_name : null;
            const joined = [meta.first_name, meta.last_name]
                .filter((v): v is string => typeof v === 'string' && v.length > 0)
                .join(' ') || null;
            people.push({ userId: u.id, name: full ?? joined, email: u.email ?? null });
            if (people.length >= ids.size) break;
        }
        if (people.length >= ids.size || data.users.length < 200 || page >= 10) break;
        page += 1;
    }
    return { data: people, error: null };
}

/** Single conversation, org-scoped (for the thread view). */
export async function getConversation(
    conversationId: string,
): Promise<{ data: Conversation | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.messaging.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data, error } = await auth.context.supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (error || !data) return { data: null, error: 'Conversation not found.' };
    return { data: data as Conversation, error: null };
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

    // Wave 3: transactional outbox — downstream fanout (push, email digest,
    // webhook) drains via cron-runner with retries instead of inline sends.
    const messageId = (data as { id?: string })?.id ?? `${conversationId}:${Date.now()}`;
    await enqueueOutboxEvent(auth.context.supabase as never, {
        organizationId: auth.organizationId,
        eventType: 'messaging.message_sent',
        payload: { conversationId, messageId, senderId: auth.userId },
        idempotencyKey: `messaging.message_sent:${messageId}`,
    });
    await recordAuditEvent(auth.context.supabase as never, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'messaging.message_sent',
        entityType: 'conversation_messages',
        entityId: messageId,
        newValues: { conversationId },
        correlationId: newCorrelationId(),
    });

    revalidatePath('/admin/messaging');
    return { data: data as ConversationMessage, error: null };
}
