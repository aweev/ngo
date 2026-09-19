-- =====================================================
-- NGO OS - Public Access Policies
-- These policies allow public read access to certain data
-- for the public-facing website
-- =====================================================

-- =====================================================
-- PUBLIC READ ACCESS FOR CAMPAIGNS
-- =====================================================
CREATE POLICY "Public can view active campaigns" ON campaigns
    FOR SELECT USING (status = 'active');

-- =====================================================
-- PUBLIC READ ACCESS FOR PROJECTS
-- =====================================================
CREATE POLICY "Public can view active projects" ON projects
    FOR SELECT USING (status IN ('active', 'completed'));

-- =====================================================
-- PUBLIC READ ACCESS FOR PARTNERS
-- =====================================================
CREATE POLICY "Public can view active partners" ON partners
    FOR SELECT USING (status = 'active');

-- =====================================================
-- PUBLIC READ ACCESS FOR DONATIONS (stats only)
-- Note: We don't expose individual donation amounts publicly
-- This is handled at the application level
-- =====================================================
CREATE POLICY "Public can view completed donations count" ON donations
    FOR SELECT USING (status = 'completed');

-- =====================================================
-- PUBLIC READ ACCESS FOR DONORS (limited)
-- Note: Only expose donor names for public recognition
-- =====================================================
CREATE POLICY "Public can view active donors" ON donors
    FOR SELECT USING (status = 'active');
