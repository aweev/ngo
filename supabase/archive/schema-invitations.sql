-- =====================================================
-- NGO OS - Staff Invitations
-- Run AFTER schema.sql (requires organizations, organization_members)
-- =====================================================

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member')),
    first_name TEXT,
    last_name TEXT,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_org ON invitations(organization_id, status);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Staff can view their organization's invitations
CREATE POLICY "Staff can view invitations" ON invitations
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    );

-- Only owners/admins/managers can create/revoke invitations
CREATE POLICY "Admins can manage invitations" ON invitations
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
    );

-- =====================================================
-- SECURITY DEFINER FUNCTIONS (public invite flow)
-- =====================================================

-- Anyone with the token can validate it (returns only safe fields)
CREATE OR REPLACE FUNCTION validate_invitation(p_token TEXT)
RETURNS TABLE (
    valid BOOLEAN,
    email TEXT,
    role TEXT,
    first_name TEXT,
    last_name TEXT,
    organization_name TEXT,
    inviter_name TEXT,
    user_exists BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
    v_org_name TEXT;
    v_inviter TEXT;
    v_user_exists BOOLEAN;
BEGIN
    SELECT * INTO v_invitation FROM invitations WHERE token = p_token;

    IF NOT FOUND OR v_invitation.status <> 'pending' OR v_invitation.expires_at < NOW() THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
        RETURN;
    END IF;

    SELECT name INTO v_org_name FROM organizations WHERE id = v_invitation.organization_id;

    SELECT COALESCE(
        (SELECT u.raw_user_meta_data->>'full_name' FROM auth.users u WHERE u.id = v_invitation.invited_by),
        ''
    ) INTO v_inviter;

    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = v_invitation.email) INTO v_user_exists;

    RETURN QUERY SELECT
        TRUE,
        v_invitation.email,
        v_invitation.role,
        v_invitation.first_name,
        v_invitation.last_name,
        v_org_name,
        v_inviter,
        v_user_exists;
END;
$$;

-- Authenticated users accept their own invitation (grants membership)
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invitation RECORD;
    v_user_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'Not authenticated');
    END IF;

    SELECT * INTO v_invitation FROM invitations WHERE token = p_token FOR UPDATE;

    IF NOT FOUND OR v_invitation.status <> 'pending' OR v_invitation.expires_at < NOW() THEN
        RETURN json_build_object('success', FALSE, 'error', 'Invitation is invalid or expired');
    END IF;

    v_user_id := auth.uid();

    IF (SELECT email FROM auth.users WHERE id = v_user_id) <> v_invitation.email THEN
        RETURN json_build_object('success', FALSE, 'error', 'This invitation was sent to a different email address');
    END IF;

    UPDATE invitations
    SET status = 'accepted', accepted_at = NOW(), accepted_by = v_user_id
    WHERE id = v_invitation.id;

    IF NOT EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = v_invitation.organization_id AND user_id = v_user_id
    ) THEN
        INSERT INTO organization_members (organization_id, user_id, role)
        VALUES (v_invitation.organization_id, v_user_id, v_invitation.role);
    END IF;

    RETURN json_build_object('success', TRUE);
END;
$$;

GRANT EXECUTE ON FUNCTION validate_invitation(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT) TO authenticated;

CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
