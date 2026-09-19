-- =====================================================
-- NGO OS - Row Level Security (RLS) Policies (Part 2)
-- Partners, Donors, Donations, Projects, Campaigns, Audit
-- =====================================================

-- =====================================================
-- RLS POLICIES - Partners
-- =====================================================

CREATE POLICY "Users can view partners" ON partners
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

CREATE POLICY "Admins can manage partners" ON partners
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
    );

-- =====================================================
-- RLS POLICIES - Donors
-- =====================================================

CREATE POLICY "Users can view donors" ON donors
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

CREATE POLICY "Admins can manage donors" ON donors
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
    );

-- =====================================================
-- RLS POLICIES - Donations
-- =====================================================

CREATE POLICY "Users can view donations" ON donations
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

CREATE POLICY "Admins can manage donations" ON donations
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
    );

-- =====================================================
-- RLS POLICIES - Projects
-- =====================================================

CREATE POLICY "Users can view projects" ON projects
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

CREATE POLICY "Admins can manage projects" ON projects
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
    );

-- =====================================================
-- RLS POLICIES - Campaigns
-- =====================================================

CREATE POLICY "Users can view campaigns" ON campaigns
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

CREATE POLICY "Admins can manage campaigns" ON campaigns
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager'))
    );

-- =====================================================
-- RLS POLICIES - Audit Logs
-- =====================================================

CREATE POLICY "Users can view audit logs" ON audit_logs
    FOR SELECT USING (
        public.user_has_org_access(organization_id)
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    );
