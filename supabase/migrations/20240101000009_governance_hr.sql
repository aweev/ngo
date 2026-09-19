-- =====================================================
-- NGO OS - Governance, Reviews, HR Lifecycle & CMS Extensions
-- Consolidated from legacy schema-governance.sql
-- =====================================================

-- Feature Flags & Toggle Engine
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, feature_key)
);

-- Executive Director & Admin Governance Approvals
CREATE TABLE IF NOT EXISTS governance_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('content_page', 'campaign', 'expense', 'budget', 'offboarding', 'hiring')),
    entity_id UUID NOT NULL,
    requested_by UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
    reviewer_id UUID,
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 360 Performance Reviews & Endorsements
CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('worker', 'volunteer', 'partner')),
    subject_id UUID NOT NULL,
    title TEXT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_period TEXT,
    strengths TEXT[] NOT NULL DEFAULT '{}',
    areas_for_growth TEXT[] NOT NULL DEFAULT '{}',
    feedback_notes TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hiring & Offboarding Lifecycle Records
CREATE TABLE IF NOT EXISTS hr_lifecycle_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    person_type TEXT NOT NULL CHECK (person_type IN ('worker', 'volunteer')),
    person_id UUID NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('onboarding', 'offboarding')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'pending_approval', 'completed', 'cancelled')),
    effective_date DATE NOT NULL,
    reason TEXT,
    checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    exit_interview_notes TEXT,
    contract_doc_url TEXT,
    access_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Multilingual CMS Translations & AI Pipeline
ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS translations JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS translation_status JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'rejected'));
ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS approved_by UUID;

-- Program & Project context for Messaging Conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS department TEXT;
