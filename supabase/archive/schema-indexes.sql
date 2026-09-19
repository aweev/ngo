-- =====================================================
-- NGO OS - Supabase Database Indexes
-- =====================================================

-- Organization indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);

-- Organization members indexes
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);

-- Workers indexes
CREATE INDEX idx_workers_org_id ON workers(organization_id);
CREATE INDEX idx_workers_email ON workers(email);
CREATE INDEX idx_workers_status ON workers(status);
CREATE INDEX idx_workers_department ON workers(department);

-- Volunteers indexes
CREATE INDEX idx_volunteers_org_id ON volunteers(organization_id);
CREATE INDEX idx_volunteers_email ON volunteers(email);
CREATE INDEX idx_volunteers_status ON volunteers(status);
CREATE INDEX idx_volunteers_skills ON volunteers USING GIN(skills);

-- Volunteer hours indexes
CREATE INDEX idx_vol_hours_org_id ON volunteer_hours(organization_id);
CREATE INDEX idx_vol_hours_volunteer_id ON volunteer_hours(volunteer_id);
CREATE INDEX idx_vol_hours_date ON volunteer_hours(date);
CREATE INDEX idx_vol_hours_status ON volunteer_hours(status);

-- Partners indexes
CREATE INDEX idx_partners_org_id ON partners(organization_id);
CREATE INDEX idx_partners_type ON partners(type);
CREATE INDEX idx_partners_status ON partners(status);

-- Donors indexes
CREATE INDEX idx_donors_org_id ON donors(organization_id);
CREATE INDEX idx_donors_email ON donors(email);
CREATE INDEX idx_donors_type ON donors(type);
CREATE INDEX idx_donors_status ON donors(status);

-- Donations indexes
CREATE INDEX idx_donations_org_id ON donations(organization_id);
CREATE INDEX idx_donations_donor_id ON donations(donor_id);
CREATE INDEX idx_donations_campaign_id ON donations(campaign_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_donated_at ON donations(donated_at);

-- Projects indexes
CREATE INDEX idx_projects_org_id ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_tags ON projects USING GIN(tags);

-- Campaigns indexes
CREATE INDEX idx_campaigns_org_id ON campaigns(organization_id);
CREATE INDEX idx_campaigns_project_id ON campaigns(project_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
