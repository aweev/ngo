-- =====================================================
-- NGO OS - Trusted data kernel (audit Wave 1)
--
-- Foundation for the chain the audit demands:
--   commitment -> restricted funding -> approved activity -> field delivery
--   -> evidence -> verified outcome -> donor claim -> audit trail
--
-- Adds:
--   legal_entity_data     organization legal identity per jurisdiction
--   fund accounting       funds, grants, fund allocation on budgets/expenses
--   tenant routing        org_domains (domain/subdomain -> organization)
--   append-only audit     audit_events (actor, reason, before/after,
--                         correlation id, exportable; UPDATE/DELETE blocked)
--   data classification   classification on documents, entity data, consent
--   privacy               consent_records, retention_schedules, legal_holds,
--                         data_subject_requests (DSAR)
--   documents             documents (private bucket, malware scan state,
--                         type verification) + evidence_links (immutable)
--   field evidence        evidence/verification columns on field_reports
-- =====================================================

-- -----------------------------------------------------
-- 1. Legal entity / jurisdiction
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS legal_entity_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    legal_name TEXT,
    legal_form TEXT,
    registration_number TEXT,
    registration_jurisdiction TEXT,
    tax_id TEXT,
    vat_id TEXT,
    registered_address TEXT,
    country TEXT,
    data_residency TEXT,
    website TEXT,
    data_classification TEXT NOT NULL DEFAULT 'internal'
        CHECK (data_classification IN ('public', 'internal', 'confidential', 'highly_sensitive')),
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 2. Fund accounting: funds + grants
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    fund_type TEXT NOT NULL DEFAULT 'unrestricted'
        CHECK (fund_type IN ('unrestricted', 'temporarily_restricted', 'permanently_restricted')),
    currency TEXT NOT NULL DEFAULT 'EUR',
    purpose TEXT,
    donor_intent TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
    grantor_name TEXT NOT NULL,
    grant_reference TEXT,
    title TEXT NOT NULL,
    description TEXT,
    amount_committed DECIMAL(15,2) NOT NULL CHECK (amount_committed >= 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    indirect_cost_rate DECIMAL(5,4) CHECK (indirect_cost_rate >= 0 AND indirect_cost_rate <= 1),
    allowable_costs JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'awarded', 'active', 'completed', 'closed', 'rejected')),
    start_date DATE,
    end_date DATE,
    reporting_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grants_org_status ON grants(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_funds_org_type ON funds(organization_id, fund_type, is_active);

-- Fund allocation on the two existing money tables (nullable = legacy rows
-- keep working; new rows should set it).
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS fund_id UUID REFERENCES funds(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS fund_id UUID REFERENCES funds(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_fund ON budgets(fund_id);
CREATE INDEX IF NOT EXISTS idx_expenses_fund ON expenses(fund_id);

-- -----------------------------------------------------
-- 3. Tenant routing (multi-org domains, branding, legal notices)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS org_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    domain TEXT UNIQUE,
    subdomain TEXT UNIQUE,
    CHECK (domain IS NOT NULL OR subdomain IS NOT NULL),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    locale_default TEXT NOT NULL DEFAULT 'en',
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_domains_org ON org_domains(organization_id);

-- -----------------------------------------------------
-- 4. Append-only audit events (trust layer)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    actor_id UUID,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    reason TEXT,
    old_values JSONB,
    new_values JSONB,
    correlation_id TEXT,
    ip_address INET,
    user_agent TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_org_time ON audit_events(organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_correlation ON audit_events(correlation_id) WHERE correlation_id IS NOT NULL;

-- Append-only: UPDATE and DELETE are rejected at the database level.
CREATE OR REPLACE FUNCTION public.block_audit_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'append-only table (attempted %)', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS audit_events_no_update ON audit_events;
CREATE TRIGGER audit_events_no_update
    BEFORE UPDATE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION public.block_audit_event_mutation();

DROP TRIGGER IF EXISTS audit_events_no_delete ON audit_events;
CREATE TRIGGER audit_events_no_delete
    BEFORE DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION public.block_audit_event_mutation();

-- -----------------------------------------------------
-- 5. Privacy: consent, retention, legal hold, DSAR
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('donor', 'volunteer', 'worker', 'newsletter_subscriber', 'form_submitter', 'beneficiary', 'other')),
    subject_id UUID,
    subject_email TEXT,
    consent_type TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'granted' CHECK (status IN ('granted', 'withdrawn', 'expired')),
    granted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    evidence_document_id UUID,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_org_subject ON consent_records(organization_id, subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_consent_email ON consent_records(subject_email);

CREATE TABLE IF NOT EXISTS retention_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    category TEXT NOT NULL,
    retention_period_months INTEGER NOT NULL CHECK (retention_period_months > 0),
    legal_basis TEXT,
    disposition TEXT NOT NULL DEFAULT 'delete' CHECK (disposition IN ('delete', 'anonymize', 'review')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legal_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    reason TEXT NOT NULL,
    scope JSONB NOT NULL DEFAULT '{}'::jsonb,
    entity_types TEXT[] NOT NULL DEFAULT '{}'::text[],
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released')),
    requested_by UUID,
    released_by UUID,
    released_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction', 'objection')),
    subject_name TEXT,
    subject_email TEXT NOT NULL,
    subject_identifiers JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'verifying', 'in_progress', 'completed', 'rejected', 'withdrawn')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    completed_at TIMESTAMPTZ,
    handled_by UUID,
    response_summary TEXT,
    result_document_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 6. Documents + immutable evidence attachments
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    bucket TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT CHECK (file_size IS NULL OR file_size >= 0),
    checksum_sha256 TEXT,
    -- upload | clean | infected | failed (malware scanning pipeline state)
    scan_state TEXT NOT NULL DEFAULT 'upload'
        CHECK (scan_state IN ('upload', 'clean', 'infected', 'failed')),
    scanned_at TIMESTAMPTZ,
    data_classification TEXT NOT NULL DEFAULT 'internal'
        CHECK (data_classification IN ('public', 'internal', 'confidential', 'highly_sensitive')),
    media_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    consent_record_id UUID REFERENCES consent_records(id) ON DELETE SET NULL,
    uploaded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_documents_org_class ON documents(organization_id, data_classification, scan_state);

-- Immutable, evidence-grade attachment to any entity.
CREATE TABLE IF NOT EXISTS evidence_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE RESTRICT,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    evidence_type TEXT NOT NULL DEFAULT 'attachment'
        CHECK (evidence_type IN ('attachment', 'receipt', 'verification', 'consent', 'photo_evidence', 'report')),
    linked_by UUID,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_evidence_links_entity ON evidence_links(entity_type, entity_id);

-- Evidence links are append-only: corrections append a new link, never rewrite.
DROP TRIGGER IF EXISTS evidence_links_no_update ON evidence_links;
CREATE TRIGGER evidence_links_no_update
    BEFORE UPDATE ON evidence_links
    FOR EACH ROW EXECUTE FUNCTION public.block_audit_event_mutation();

-- Field reports: evidence + verification-state completion for Wave 1.
ALTER TABLE field_reports ADD COLUMN IF NOT EXISTS evidence_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE field_reports ADD COLUMN IF NOT EXISTS verified_by UUID;

-- -----------------------------------------------------
-- 7. RLS: enable + permission-aware tenant policies
-- (same generator as 20240101000014_rls_policies.sql)
-- -----------------------------------------------------
ALTER TABLE legal_entity_data ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('legal_entity_data', 'settings.read', 'settings.manage');

ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('funds', 'finance.read', 'finance.manage');

ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('grants', 'finance.read', 'finance.manage');

ALTER TABLE org_domains ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('org_domains', 'settings.read', 'settings.manage');

-- Privacy kernel: governed by the governance capability.
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('consent_records', 'governance.read', 'governance.manage');

ALTER TABLE retention_schedules ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('retention_schedules', 'governance.read', 'governance.manage');

ALTER TABLE legal_holds ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('legal_holds', 'governance.read', 'governance.manage');

ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('data_subject_requests', 'governance.read', 'governance.manage');

-- Documents + evidence: the trust chain is audited data.
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('documents', 'audit.read', 'audit.manage');

ALTER TABLE evidence_links ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('evidence_links', 'audit.read', 'audit.manage');

-- Audit events: read-only for tenant members (appends happen server-side).
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_audit_events ON audit_events;
CREATE POLICY tenant_isolation_audit_events ON audit_events
    FOR SELECT
    USING (organization_id IS NOT NULL AND public.user_has_permission(organization_id, 'audit.read'));

-- -----------------------------------------------------
-- 8. updated_at triggers on the new tables
-- -----------------------------------------------------
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'legal_entity_data', 'funds', 'grants', 'org_domains', 'consent_records',
        'retention_schedules', 'legal_holds', 'data_subject_requests', 'documents'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%1$s_updated_at ON %1$I', t);
        EXECUTE format(
            'CREATE TRIGGER update_%1$s_updated_at BEFORE UPDATE ON %1$I
             FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
    END LOOP;
END $$;

COMMENT ON TABLE audit_events IS
    'Wave 1: append-only audit events (actor, reason, before/after, correlation id). UPDATE/DELETE are blocked by triggers; export via the Trust Center.';
COMMENT ON TABLE evidence_links IS
    'Wave 1: immutable evidence attachments. Corrections append; never rewrite.';


