export interface FeatureFlag {
    id: string;
    organization_id: string;
    feature_key: string;
    is_enabled: boolean;
    config: Record<string, unknown>;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type ApprovalEntityType = 'content_page' | 'campaign' | 'expense' | 'budget' | 'offboarding' | 'hiring';

export interface GovernanceApproval {
    id: string;
    organization_id: string;
    entity_type: ApprovalEntityType;
    entity_id: string;
    requested_by: string;
    status: ApprovalStatus;
    reviewer_id: string | null;
    review_notes: string | null;
    reviewed_at: string | null;
    created_at: string;
    updated_at: string;
}

export type ReviewSubjectType = 'worker' | 'volunteer' | 'partner';

export interface PerformanceReview {
    id: string;
    organization_id: string;
    reviewer_id: string;
    subject_type: ReviewSubjectType;
    subject_id: string;
    title: string;
    rating: number; // 1-5
    review_period: string | null;
    strengths: string[];
    areas_for_growth: string[];
    feedback_notes: string;
    is_private: boolean;
    created_at: string;
    updated_at: string;
}

export type HRLifecycleType = 'onboarding' | 'offboarding';
export type HRLifecycleStatus = 'draft' | 'in_progress' | 'pending_approval' | 'completed' | 'cancelled';

export interface HRLifecycleChecklistItem {
    id: string;
    label: string;
    completed: boolean;
    assigned_to?: string;
}

export interface HRLifecycleRecord {
    id: string;
    organization_id: string;
    person_type: 'worker' | 'volunteer';
    person_id: string;
    type: HRLifecycleType;
    status: HRLifecycleStatus;
    effective_date: string;
    reason: string | null;
    checklist: HRLifecycleChecklistItem[];
    exit_interview_notes: string | null;
    contract_doc_url: string | null;
    access_revoked: boolean;
    approved_by: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface TranslationData {
    title?: string;
    content?: string;
    meta_title?: string;
    meta_description?: string;
}
