/**
 * Trust kernel domain types (audit Wave 1):
 * legal entity, funds, grants, tenant domains, append-only audit events,
 * consent/retention/legal-hold/DSAR, documents + immutable evidence links.
 */

export type DataClassification = 'public' | 'internal' | 'confidential' | 'highly_sensitive';

export interface LegalEntityData {
    id: string;
    organization_id: string;
    legal_name: string | null;
    legal_form: string | null;
    registration_number: string | null;
    registration_jurisdiction: string | null;
    tax_id: string | null;
    vat_id: string | null;
    registered_address: string | null;
    country: string | null;
    data_residency: string | null;
    website: string | null;
    data_classification: DataClassification;
    verified_at: string | null;
    verified_by: string | null;
    created_at: string;
    updated_at: string;
}

export type FundType = 'unrestricted' | 'temporarily_restricted' | 'permanently_restricted';

export interface Fund {
    id: string;
    organization_id: string;
    name: string;
    code: string | null;
    fund_type: FundType;
    currency: string;
    purpose: string | null;
    donor_intent: string | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export type GrantStatus = 'draft' | 'submitted' | 'awarded' | 'active' | 'completed' | 'closed' | 'rejected';

export interface Grant {
    id: string;
    organization_id: string;
    fund_id: string | null;
    grantor_name: string;
    grant_reference: string | null;
    title: string;
    description: string | null;
    amount_committed: number;
    currency: string;
    indirect_cost_rate: number | null;
    allowable_costs: Record<string, unknown>;
    status: GrantStatus;
    start_date: string | null;
    end_date: string | null;
    reporting_requirements: Record<string, unknown>;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface OrgDomain {
    id: string;
    organization_id: string;
    domain: string | null;
    subdomain: string | null;
    is_primary: boolean;
    locale_default: string;
    verified_at: string | null;
    created_at: string;
    updated_at: string;
}

/** Append-only audit event (UPDATE/DELETE blocked by database triggers). */
export interface AuditEvent {
    id: string;
    organization_id: string | null;
    actor_id: string | null;
    actor_role: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    reason: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    correlation_id: string | null;
    ip_address: string | null;
    user_agent: string | null;
    occurred_at: string;
}

export type ConsentSubjectType =
    | 'donor'
    | 'volunteer'
    | 'worker'
    | 'newsletter_subscriber'
    | 'form_submitter'
    | 'beneficiary'
    | 'other';

export type ConsentStatus = 'granted' | 'withdrawn' | 'expired';

export interface ConsentRecord {
    id: string;
    organization_id: string;
    subject_type: ConsentSubjectType;
    subject_id: string | null;
    subject_email: string | null;
    consent_type: string;
    policy_version: string;
    status: ConsentStatus;
    granted_at: string | null;
    withdrawn_at: string | null;
    expires_at: string | null;
    evidence_document_id: string | null;
    source: string | null;
    created_at: string;
    updated_at: string;
}

export interface RetentionPolicy {
    id: string;
    organization_id: string;
    entity_type: string;
    category: string;
    retention_period_months: number;
    legal_basis: string | null;
    disposition: 'delete' | 'anonymize' | 'review';
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface LegalHold {
    id: string;
    organization_id: string;
    name: string;
    reason: string;
    scope: Record<string, unknown>;
    entity_types: string[];
    status: 'active' | 'released';
    requested_by: string | null;
    released_by: string | null;
    released_at: string | null;
    created_at: string;
    updated_at: string;
}

export type DsarType = 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
export type DsarStatus = 'received' | 'verifying' | 'in_progress' | 'completed' | 'rejected' | 'withdrawn';

export interface DataSubjectRequest {
    id: string;
    organization_id: string;
    request_type: DsarType;
    subject_name: string | null;
    subject_email: string;
    subject_identifiers: Record<string, unknown>;
    status: DsarStatus;
    received_at: string;
    due_at: string;
    completed_at: string | null;
    handled_by: string | null;
    response_summary: string | null;
    result_document_id: string | null;
    created_at: string;
    updated_at: string;
}

export type DocumentScanState = 'upload' | 'clean' | 'infected' | 'failed';

export interface TrustDocument {
    id: string;
    organization_id: string;
    bucket: string;
    storage_path: string;
    file_name: string;
    mime_type: string;
    file_size: number | null;
    checksum_sha256: string | null;
    scan_state: DocumentScanState;
    scanned_at: string | null;
    data_classification: DataClassification;
    media_metadata: Record<string, unknown>;
    consent_record_id: string | null;
    uploaded_by: string | null;
    created_at: string;
    updated_at: string;
}

export type EvidenceType = 'attachment' | 'receipt' | 'verification' | 'consent' | 'photo_evidence' | 'report';

export interface EvidenceLink {
    id: string;
    organization_id: string;
    document_id: string;
    entity_type: string;
    entity_id: string;
    evidence_type: EvidenceType;
    linked_by: string | null;
    linked_at: string;
}
