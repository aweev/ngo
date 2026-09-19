-- Self-service requests for an additional organization role.
CREATE TABLE IF NOT EXISTS role_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    requested_role TEXT NOT NULL CHECK (requested_role IN ('manager', 'admin')),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_requests_pending
    ON role_requests (organization_id, user_id, requested_role)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_role_requests_org_status
    ON role_requests (organization_id, status, created_at DESC);

ALTER TABLE role_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_requests_select" ON role_requests;
CREATE POLICY "role_requests_select" ON role_requests FOR SELECT USING (
    user_id = auth.uid() OR public.user_has_permission(organization_id, 'members.manage')
);

DROP POLICY IF EXISTS "role_requests_insert" ON role_requests;
CREATE POLICY "role_requests_insert" ON role_requests FOR INSERT WITH CHECK (
    user_id = auth.uid() AND public.user_has_org_access(organization_id)
);

DROP POLICY IF EXISTS "role_requests_update" ON role_requests;
CREATE POLICY "role_requests_update" ON role_requests FOR UPDATE USING (
    (user_id = auth.uid() AND status = 'pending') OR public.user_has_permission(organization_id, 'members.manage')
) WITH CHECK (
    (user_id = auth.uid() AND status = 'cancelled') OR public.user_has_permission(organization_id, 'members.manage')
);
