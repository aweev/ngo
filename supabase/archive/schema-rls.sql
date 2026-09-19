-- =====================================================
-- NGO OS - Row Level Security (RLS) Policies
-- =====================================================

-- Helper function to check org membership (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.user_has_org_access(org_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM public.organization_members 
        WHERE organization_id = org_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - Organizations & Members
-- =====================================================

CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (
        public.user_has_org_access(id)
    );

CREATE POLICY "Owners can update organization" ON organizations
    FOR UPDATE USING (
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Users can view organization members" ON organization_members
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

-- =====================================================
-- RLS POLICIES - Workers
-- =====================================================

CREATE POLICY "Users can view workers" ON workers
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

CREATE POLICY "Admins can manage workers" ON workers
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
    );

-- =====================================================
-- RLS POLICIES - Volunteers
-- =====================================================

CREATE POLICY "Users can view volunteers" ON volunteers
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

CREATE POLICY "Admins can manage volunteers" ON volunteers
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
    );
