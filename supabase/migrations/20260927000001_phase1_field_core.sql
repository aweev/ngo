-- Phase 1 field core: households, beneficiaries, services, referrals.
-- PII columns store AES-GCM ciphertext written by the server field-crypto
-- module. Names are never stored in cleartext. Search and duplicate checks
-- run against deterministic blind-index hashes, not raw names.

-- -----------------------------------------------------
-- 1. Households
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    head_name_encrypted TEXT NOT NULL,
    head_search_hash TEXT NOT NULL,
    location_text TEXT NOT NULL DEFAULT '',
    member_count INT NOT NULL DEFAULT 1 CHECK (member_count >= 1),
    consent_id UUID REFERENCES consent_records(id) ON DELETE SET NULL,
    created_by UUID,
    device_id TEXT,
    offline_uuid TEXT UNIQUE,
    schema_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_households_org_hash
    ON households(organization_id, head_search_hash);
CREATE INDEX IF NOT EXISTS idx_households_offline
    ON households(organization_id, offline_uuid);

-- -----------------------------------------------------
-- 2. Beneficiaries
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    household_id UUID REFERENCES households(id) ON DELETE SET NULL,
    full_name_encrypted TEXT NOT NULL,
    search_hash TEXT NOT NULL,
    sex TEXT NOT NULL DEFAULT 'unknown'
        CHECK (sex IN ('female', 'male', 'other', 'unknown')),
    age_band TEXT NOT NULL DEFAULT 'unknown'
        CHECK (age_band IN ('under_5', 'age_5_11', 'age_12_17', 'age_18_59', 'age_60_plus', 'unknown')),
    disability TEXT NOT NULL DEFAULT 'unknown'
        CHECK (disability IN ('none', 'seeing', 'hearing', 'mobility', 'cognition', 'self_care', 'communication', 'unknown')),
    phone_encrypted TEXT,
    location_text TEXT NOT NULL DEFAULT '',
    consent_id UUID REFERENCES consent_records(id) ON DELETE SET NULL,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_by UUID,
    device_id TEXT,
    offline_uuid TEXT UNIQUE,
    schema_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_org_hash
    ON beneficiaries(organization_id, search_hash);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_household
    ON beneficiaries(household_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_offline
    ON beneficiaries(organization_id, offline_uuid);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_active
    ON beneficiaries(organization_id, is_archived, updated_at DESC);

-- -----------------------------------------------------
-- 3. Services delivered
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    service_type TEXT NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    delivered_at DATE NOT NULL DEFAULT CURRENT_DATE,
    delivered_by UUID,
    device_id TEXT,
    note TEXT,
    offline_uuid TEXT UNIQUE,
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_beneficiary
    ON services(beneficiary_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_org_project
    ON services(organization_id, project_id, delivered_at DESC);

-- -----------------------------------------------------
-- 4. Referrals
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
    referred_to TEXT NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'accepted', 'completed', 'closed', 'expired')),
    follow_up_at DATE,
    created_by UUID,
    device_id TEXT,
    offline_uuid TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_beneficiary
    ON referrals(beneficiary_id, status);
CREATE INDEX IF NOT EXISTS idx_referrals_followup
    ON referrals(organization_id, status, follow_up_at);

-- -----------------------------------------------------
-- 5. Sync conflicts (offline last-write races, resolved by a human)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    offline_uuid TEXT,
    local_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    server_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'resolved_local', 'resolved_server', 'merged')),
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_org_status
    ON sync_conflicts(organization_id, status, created_at DESC);

-- -----------------------------------------------------
-- 6. Project kind (program vs campaign vs event, merged in Phase 4)
-- -----------------------------------------------------
ALTER TABLE projects ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'program'
    CHECK (kind IN ('program', 'campaign', 'event'));

-- -----------------------------------------------------
-- 7. Triggers: updated_at plus org immutability
-- -----------------------------------------------------
DROP TRIGGER IF EXISTS update_households_updated_at ON households;
CREATE TRIGGER update_households_updated_at
    BEFORE UPDATE ON households
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_beneficiaries_updated_at ON beneficiaries;
CREATE TRIGGER update_beneficiaries_updated_at
    BEFORE UPDATE ON beneficiaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at
    BEFORE UPDATE ON referrals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sync_conflicts_updated_at ON sync_conflicts;
CREATE TRIGGER update_sync_conflicts_updated_at
    BEFORE UPDATE ON sync_conflicts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_prevent_org_change ON households;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON households
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

DROP TRIGGER IF EXISTS trg_prevent_org_change ON beneficiaries;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON beneficiaries
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

DROP TRIGGER IF EXISTS trg_prevent_org_change ON services;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

DROP TRIGGER IF EXISTS trg_prevent_org_change ON referrals;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON referrals
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

DROP TRIGGER IF EXISTS trg_prevent_org_change ON sync_conflicts;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON sync_conflicts
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

-- -----------------------------------------------------
-- 8. Permission matrix: field roles need beneficiary access.
-- Field officers are members. Managers run verification queues.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.role_has_permission(p_role text, p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT CASE
        WHEN p_role IN ('owner', 'admin') THEN TRUE
        WHEN p_role = 'manager' THEN p_permission IN (
            'settings.read',
            'members.read',
            'workers.read', 'workers.manage',
            'volunteers.read', 'volunteers.manage', 'volunteers.approve_hours',
            'partners.read', 'partners.manage',
            'donors.read',
            'donations.read', 'donations.create',
            'projects.read', 'projects.manage',
            'campaigns.read', 'campaigns.manage',
            'events.read', 'events.manage',
            'forms.read', 'forms.manage',
            'impact.read', 'impact.manage',
            'content.read', 'content.manage',
            'messaging.read',
            'notifications.read',
            'tags.read', 'tags.manage',
            'finance.read',
            'reporting.read',
            'scheduling.read',
            'automations.read',
            'workflows.read',
            'governance.read',
            'beneficiaries.read', 'beneficiaries.manage'
        )
        WHEN p_role = 'member' THEN p_permission IN (
            'notifications.read',
            'messaging.read',
            'events.read',
            'projects.read',
            'beneficiaries.read', 'beneficiaries.manage'
        )
        ELSE FALSE
    END;
$$;

-- -----------------------------------------------------
-- 9. RLS (generator call is sufficient evidence post-hardening)
-- -----------------------------------------------------
SELECT public.add_tenant_policies('households', 'beneficiaries.read', 'beneficiaries.manage');
SELECT public.add_tenant_policies('beneficiaries', 'beneficiaries.read', 'beneficiaries.manage');
SELECT public.add_tenant_policies('services', 'beneficiaries.read', 'beneficiaries.manage');
SELECT public.add_tenant_policies('referrals', 'beneficiaries.read', 'beneficiaries.manage');
SELECT public.add_tenant_policies('sync_conflicts', 'beneficiaries.read', 'beneficiaries.manage');
