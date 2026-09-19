-- =====================================================
-- NGO OS - Public Forms, Newsletter & Donations
-- Tables powering the public website forms
-- Run AFTER schema.sql, schema-part2.sql, schema-triggers.sql
-- =====================================================

-- =====================================================
-- FORM SUBMISSIONS (contact, safeguarding, corporate, etc.)
-- =====================================================
CREATE TABLE form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    form_slug TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_review', 'resolved', 'spam')),
    submission_data JSONB NOT NULL DEFAULT '{}',
    locale TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- NEWSLETTER SUBSCRIBERS
-- =====================================================
CREATE TABLE newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced')),
    locale TEXT,
    source TEXT NOT NULL DEFAULT 'website',
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_form_submissions_slug ON form_submissions(form_slug, status, submitted_at DESC);
CREATE INDEX idx_form_submissions_org ON form_submissions(organization_id);
CREATE INDEX idx_newsletter_subscribers_status ON newsletter_subscribers(status);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can submit public forms
CREATE POLICY "Public can submit forms" ON form_submissions
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Organization members can view submissions for their org
CREATE POLICY "Staff can view form submissions" ON form_submissions
    FOR SELECT USING (
        organization_id IS NULL OR organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Only owners/admins/managers can update submission status
CREATE POLICY "Staff can manage form submissions" ON form_submissions
    FOR UPDATE USING (
        organization_id IS NULL OR organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'manager')
        )
    );

-- Anyone can subscribe to the newsletter
CREATE POLICY "Public can subscribe to newsletter" ON newsletter_subscribers
    FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Organization members can view newsletter subscribers
CREATE POLICY "Staff can view newsletter subscribers" ON newsletter_subscribers
    FOR SELECT USING (
        organization_id IS NULL OR organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Public donation pledges are stored as 'pending' until payment is processed
CREATE POLICY "Public can create pending donations" ON donations
    FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_form_submissions_updated_at BEFORE UPDATE ON form_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_newsletter_subscribers_updated_at BEFORE UPDATE ON newsletter_subscribers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
