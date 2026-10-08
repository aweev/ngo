/**
 * Append-only audit event writer (audit Wave 1 trust kernel).
 *
 * Plain server module (NOT 'use server'). Every action that moves money,
 * approves, publishes, exports data, or mutates sensitive records calls
 * `recordAuditEvent()`; the database trigger additionally makes
 * `audit_events` immutable (20260922000004_trust_kernel.sql).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface AuditEventInput {
    organizationId: string | null;
    actorId?: string | null;
    actorRole?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    reason?: string | null;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    correlationId?: string | null;
}

/** Correlation id shared by all events of one logical operation. */
export function newCorrelationId(): string {
    return `corr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Writes one audit event. Never throws: an audit failure must not roll back
 * the business operation, but it IS logged loudly for follow-up.
 */
export async function recordAuditEvent(
    supabase: SupabaseClient,
    input: AuditEventInput,
): Promise<void> {
    const { error } = await supabase.from('audit_events').insert({
        organization_id: input.organizationId,
        actor_id: input.actorId ?? null,
        actor_role: input.actorRole ?? null,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        reason: input.reason ?? null,
        old_values: input.oldValues ?? null,
        new_values: input.newValues ?? null,
        correlation_id: input.correlationId ?? null,
    });
    if (error) {
        console.error('[audit-events] Failed to record audit event:', error.message, input.action);
    }
}
