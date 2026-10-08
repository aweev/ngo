'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { newCorrelationId, recordAuditEvent } from '@/lib/audit-events';
import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import {
    MAX_TRUST_DOCUMENT_BYTES,
    TRUST_DOCUMENTS_BUCKET,
    TRUST_DOCUMENT_CLASSIFICATIONS,
    buildTrustDocumentPath,
    clampSignedUrlTtl,
    detectTrustDocumentType,
    sanitizeStorageFileName,
    sha256Hex,
    stripImageMetadata,
} from '@/lib/trust-documents';
import type { EvidenceLink, TrustDocument } from '@/types/domain/trust';

export interface DocumentActionResult<T> {
    data: T | null;
    error: string | null;
}

const SCAN_STATES = ['upload', 'clean', 'infected', 'failed'] as const;

const uploadMetaSchema = z.object({
    data_classification: z.enum(TRUST_DOCUMENT_CLASSIFICATIONS).default('confidential'),
    consent_record_id: z.string().uuid().optional().nullable(),
});

const evidenceSchema = z.object({
    document_id: z.string().uuid(),
    entity_type: z.string().trim().min(2).max(64),
    entity_id: z.string().uuid(),
    evidence_type: z
        .enum(['attachment', 'receipt', 'verification', 'consent', 'photo_evidence', 'report'])
        .default('attachment'),
});

const GOVERNANCE_PATH = '/[locale]/admin/governance';

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

export async function listTrustDocuments(options?: {
    search?: string;
    scan_state?: string;
    limit?: number;
}): Promise<DocumentActionResult<TrustDocument[]>> {
    const auth = await authorizePermission(PERMISSIONS.audit.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
    let query = auth.context.supabase
        .from('documents')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);

    const search = options?.search?.trim();
    if (search) query = query.ilike('file_name', `%${search.replace(/[%_,()]/g, ' ')}%`);
    const scanState = options?.scan_state;
    if (scanState && (SCAN_STATES as readonly string[]).includes(scanState)) {
        query = query.eq('scan_state', scanState);
    }

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as TrustDocument[], error: null };
}

// ---------------------------------------------------------------------------
// Upload: magic-byte verification + metadata stripping + SHA-256 checksum.
// Starts in scan_state 'upload' — never downloadable until an AV worker calls
// recordDocumentScanResult() with 'clean' (stop-ship finding #5 gate).
// ---------------------------------------------------------------------------

export async function uploadTrustDocument(formData: FormData): Promise<DocumentActionResult<TrustDocument>> {
    const auth = await authorizePermission(PERMISSIONS.audit.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const parsedMeta = uploadMetaSchema.safeParse({
        data_classification: formData.get('data_classification') ?? undefined,
        consent_record_id: formData.get('consent_record_id') || null,
    });
    if (!parsedMeta.success) return { data: null, error: 'Invalid document metadata.' };

    const raw = formData.get('file');
    if (!(raw instanceof File) || raw.size === 0) return { data: null, error: 'No file provided.' };
    if (raw.size > MAX_TRUST_DOCUMENT_BYTES) return { data: null, error: 'File exceeds the 25 MB limit.' };

    const original = new Uint8Array(await raw.arrayBuffer());
    const detected = detectTrustDocumentType(original, raw.type);
    if (!detected.ok) return { data: null, error: detected.reason };

    const stripResult = stripImageMetadata(original, detected.mime);
    if (!stripResult) return { data: null, error: 'The image is corrupt and could not be processed.' };

    const stored = stripResult.bytes;
    const checksum = sha256Hex(stored);
    const documentId = randomUUID();
    const fileName = sanitizeStorageFileName(raw.name);
    const storagePath = buildTrustDocumentPath(auth.organizationId, documentId, fileName);

    const admin = createSupabaseAdminClient();
    const { error: uploadError } = await admin.storage.from(TRUST_DOCUMENTS_BUCKET).upload(storagePath, stored, {
        contentType: detected.mime,
        cacheControl: '3600',
        upsert: false,
    });
    if (uploadError) return { data: null, error: `Upload failed: ${uploadError.message}` };

    const { data, error } = await auth.context.supabase
        .from('documents')
        .insert({
            id: documentId,
            organization_id: auth.organizationId,
            bucket: TRUST_DOCUMENTS_BUCKET,
            storage_path: storagePath,
            file_name: fileName,
            mime_type: detected.mime,
            file_size: stored.length,
            checksum_sha256: checksum,
            scan_state: 'upload',
            data_classification: parsedMeta.data.data_classification,
            media_metadata: {
                original_bytes: original.length,
                stored_bytes: stored.length,
                metadata_stripped: stripResult.stripped,
                verified_by: 'magic-bytes',
            },
            consent_record_id: parsedMeta.data.consent_record_id ?? null,
            uploaded_by: auth.userId,
        })
        .select('*')
        .single();
    if (error) {
        await admin.storage.from(TRUST_DOCUMENTS_BUCKET).remove([storagePath]);
        return { data: null, error: error.message };
    }

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'document.uploaded',
        entityType: 'documents',
        entityId: documentId,
        newValues: {
            file_name: fileName,
            mime_type: detected.mime,
            file_size: stored.length,
            checksum_sha256: checksum,
            data_classification: parsedMeta.data.data_classification,
            metadata_stripped: stripResult.stripped,
        },
        correlationId: newCorrelationId(),
    });
    revalidatePath(GOVERNANCE_PATH, 'page');
    return { data: data as TrustDocument, error: null };
}

// ---------------------------------------------------------------------------
// Signed URLs — only after a CLEAN malware scan. The bytes live in a private
// bucket; this is the only read path in the app.
// ---------------------------------------------------------------------------

export async function createTrustDocumentSignedUrl(
    documentId: string,
    expiresInSeconds = 300,
): Promise<DocumentActionResult<{ signedUrl: string; expiresAt: string }>> {
    const auth = await authorizePermission(PERMISSIONS.audit.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: doc, error } = await auth.context.supabase
        .from('documents')
        .select('id, storage_path, scan_state, file_name, organization_id')
        .eq('id', documentId)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (error) return { data: null, error: error.message };
    if (!doc) return { data: null, error: 'Document not found.' };
    if (doc.scan_state !== 'clean') {
        return { data: null, error: 'Document is not cleared for release (malware scan pending or failed).' };
    }

    const ttl = clampSignedUrlTtl(expiresInSeconds);
    const admin = createSupabaseAdminClient();
    const { data: signed, error: signError } = await admin.storage
        .from(TRUST_DOCUMENTS_BUCKET)
        .createSignedUrl(doc.storage_path, ttl);
    if (signError || !signed?.signedUrl) {
        return { data: null, error: signError?.message ?? 'Could not sign the URL.' };
    }

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'document.signed_url_issued',
        entityType: 'documents',
        entityId: documentId,
        newValues: { ttl_seconds: ttl, file_name: doc.file_name },
        correlationId: newCorrelationId(),
    });
    return {
        data: { signedUrl: signed.signedUrl, expiresAt: new Date(Date.now() + ttl * 1000).toISOString() },
        error: null,
    };
}

// ---------------------------------------------------------------------------
// AV scan hook — called by the malware-scanner worker (stop-ship #5 gate).
// ---------------------------------------------------------------------------

const scanResultSchema = z.object({
    scan_state: z.enum(['clean', 'infected', 'failed']),
    engine: z.string().trim().max(120).optional().nullable(),
});

export async function recordDocumentScanResult(
    documentId: string,
    input: unknown,
): Promise<DocumentActionResult<TrustDocument>> {
    const auth = await authorizePermission(PERMISSIONS.audit.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const parsed = scanResultSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid scan result.' };

    const { data: before } = await auth.context.supabase
        .from('documents')
        .select('id, scan_state, organization_id')
        .eq('id', documentId)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!before) return { data: null, error: 'Document not found.' };

    const { data, error } = await auth.context.supabase
        .from('documents')
        .update({
            scan_state: parsed.data.scan_state,
            scanned_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .eq('organization_id', auth.organizationId)
        .select('*')
        .single();
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'document.scan_result',
        entityType: 'documents',
        entityId: documentId,
        oldValues: { scan_state: before.scan_state },
        newValues: {
            scan_state: parsed.data.scan_state,
            engine: parsed.data.engine ?? 'unspecified',
        },
        correlationId: newCorrelationId(),
    });
    revalidatePath(GOVERNANCE_PATH, 'page');
    return { data: data as TrustDocument, error: null };
}

// ---------------------------------------------------------------------------
// Evidence links (append-only — FK RESTRICT also protects documents)
// ---------------------------------------------------------------------------

export async function attachEvidenceLink(input: unknown): Promise<DocumentActionResult<EvidenceLink>> {
    const auth = await authorizePermission(PERMISSIONS.audit.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const parsed = evidenceSchema.safeParse(input);
    if (!parsed.success) return { data: null, error: 'Invalid evidence link.' };

    const { data: doc } = await auth.context.supabase
        .from('documents')
        .select('id, scan_state, file_name')
        .eq('id', parsed.data.document_id)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!doc) return { data: null, error: 'Document not found.' };
    if (doc.scan_state !== 'clean') {
        return { data: null, error: 'Only documents that passed malware scanning can be attached as evidence.' };
    }

    const { data, error } = await auth.context.supabase
        .from('evidence_links')
        .insert({
            organization_id: auth.organizationId,
            document_id: parsed.data.document_id,
            entity_type: parsed.data.entity_type,
            entity_id: parsed.data.entity_id,
            evidence_type: parsed.data.evidence_type,
            linked_by: auth.userId,
        })
        .select('*')
        .single();
    if (error) {
        if (error.code === '23505') return { data: null, error: 'This document is already attached to that record.' };
        return { data: null, error: error.message };
    }

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'document.evidence_linked',
        entityType: 'evidence_links',
        entityId: (data as EvidenceLink).id,
        newValues: {
            document_id: parsed.data.document_id,
            entity_type: parsed.data.entity_type,
            entity_id: parsed.data.entity_id,
            evidence_type: parsed.data.evidence_type,
        },
        correlationId: newCorrelationId(),
    });
    return { data: data as EvidenceLink, error: null };
}

export async function listEvidenceLinks(filter?: {
    document_id?: string;
    entity_type?: string;
    entity_id?: string;
}): Promise<DocumentActionResult<EvidenceLink[]>> {
    const auth = await authorizePermission(PERMISSIONS.audit.read);
    if (!auth.ok) return { data: null, error: auth.error };

    let query = auth.context.supabase
        .from('evidence_links')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .order('created_at', { ascending: false })
        .limit(500);
    if (filter?.document_id) query = query.eq('document_id', filter.document_id);
    if (filter?.entity_type) query = query.eq('entity_type', filter.entity_type);
    if (filter?.entity_id) query = query.eq('entity_id', filter.entity_id);

    const { data, error } = await query;
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as EvidenceLink[], error: null };
}

// ---------------------------------------------------------------------------
// Guarded delete: blocked while referenced as evidence or under legal hold
// ---------------------------------------------------------------------------

export async function deleteTrustDocument(documentId: string, reason?: string): Promise<DocumentActionResult<null>> {
    const auth = await authorizePermission(PERMISSIONS.audit.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    const { data: doc } = await auth.context.supabase
        .from('documents')
        .select('id, storage_path, file_name, scan_state, organization_id')
        .eq('id', documentId)
        .eq('organization_id', auth.organizationId)
        .maybeSingle();
    if (!doc) return { data: null, error: 'Document not found.' };

    const { count: linkCount } = await auth.context.supabase
        .from('evidence_links')
        .select('id', { count: 'exact', head: true })
        .eq('document_id', documentId)
        .eq('organization_id', auth.organizationId);
    if ((linkCount ?? 0) > 0) {
        return {
            data: null,
            error: 'Document is referenced by evidence links and cannot be deleted. Remove the links first.',
        };
    }

    const { data: holds } = await auth.context.supabase
        .from('legal_holds')
        .select('id, name, entity_types')
        .eq('organization_id', auth.organizationId)
        .eq('status', 'active');
    const blockingHold = (holds ?? []).find(
        (hold) => !hold.entity_types?.length || (hold.entity_types as string[]).includes('documents'),
    );
    if (blockingHold) {
        return { data: null, error: `Document is under an active legal hold ("${blockingHold.name}").` };
    }

    const admin = createSupabaseAdminClient();
    await admin.storage.from(TRUST_DOCUMENTS_BUCKET).remove([doc.storage_path]);

    const { error } = await auth.context.supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('organization_id', auth.organizationId);
    if (error) return { data: null, error: error.message };

    await recordAuditEvent(auth.context.supabase, {
        organizationId: auth.organizationId,
        actorId: auth.userId,
        action: 'document.deleted',
        entityType: 'documents',
        entityId: documentId,
        reason: reason?.trim() || null,
        oldValues: { file_name: doc.file_name, scan_state: doc.scan_state },
        correlationId: newCorrelationId(),
    });
    revalidatePath(GOVERNANCE_PATH, 'page');
    return { data: null, error: null };
}



