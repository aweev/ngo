/**
 * Phase 1 field domain types: households, beneficiaries, services, referrals.
 * PII travels decrypted in these interfaces ONLY inside authorized server
 * flows and the field UI — Postgres stores ciphertext plus blind hashes.
 */
export type Sex = 'female' | 'male' | 'other' | 'unknown';
export type AgeBand = 'under_5' | 'age_5_11' | 'age_12_17' | 'age_18_59' | 'age_60_plus' | 'unknown';
export type Disability =
    | 'none' | 'seeing' | 'hearing' | 'mobility'
    | 'cognition' | 'self_care' | 'communication' | 'unknown';
export type ReferralStatus = 'open' | 'accepted' | 'completed' | 'closed' | 'expired';
export type SyncConflictStatus = 'open' | 'resolved_local' | 'resolved_server' | 'merged';

export interface Household {
    id: string;
    organization_id: string;
    /** Decrypted head-of-household name (authorized readers only). */
    head_name: string;
    location_text: string;
    member_count: number;
    consent_id: string | null;
    offline_uuid: string | null;
    created_at: string;
    updated_at: string;
}

export interface Beneficiary {
    id: string;
    organization_id: string;
    household_id: string | null;
    /** Decrypted full name (authorized readers only). */
    full_name: string;
    sex: Sex;
    age_band: AgeBand;
    disability: Disability;
    /** Decrypted phone (authorized readers only, may be null). */
    phone: string | null;
    location_text: string;
    consent_id: string | null;
    is_archived: boolean;
    offline_uuid: string | null;
    /** Base version for offline conflict detection (raw updated_at). */
    updated_at: string;
    created_at: string;
}

export interface ServiceRecord {
    id: string;
    organization_id: string;
    beneficiary_id: string;
    project_id: string | null;
    service_type: string;
    quantity: number;
    delivered_at: string;
    offline_uuid: string | null;
    idempotency_key: string;
    created_at: string;
}

export interface Referral {
    id: string;
    organization_id: string;
    beneficiary_id: string;
    referred_to: string;
    reason: string | null;
    status: ReferralStatus;
    follow_up_at: string | null;
    offline_uuid: string | null;
    created_at: string;
    updated_at: string;
}

export interface SyncConflict {
    id: string;
    organization_id: string;
    entity_type: string;
    entity_id: string | null;
    offline_uuid: string | null;
    local_data: Record<string, unknown>;
    server_data: Record<string, unknown>;
    status: SyncConflictStatus;
    created_at: string;
}

/** Duplicate candidate surfaced before insert or at sync time. */
export interface DuplicateCandidate {
    id: string;
    full_name: string;
    household_id: string | null;
    location_text: string;
    sex: Sex;
    age_band: AgeBand;
    match_reason: 'same_name' | 'same_household_profile';
}

/** One offline operation the field client queues in IndexedDB. */
export type FieldOpKind = 'household' | 'beneficiary' | 'service' | 'referral';

export interface FieldOp {
    kind: FieldOpKind;
    offline_uuid: string;
    idempotency_key: string;
    /** Server row version the edit was based on (conflict detection). */
    base_updated_at?: string | null;
    payload: Record<string, unknown>;
}
