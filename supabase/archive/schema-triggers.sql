-- =====================================================
-- NGO OS - Functions & Triggers
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workers_updated_at BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volunteers_updated_at BEFORE UPDATE ON volunteers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_volunteer_hours_updated_at BEFORE UPDATE ON volunteer_hours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donors_updated_at BEFORE UPDATE ON donors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update donor total_donated
CREATE OR REPLACE FUNCTION update_donor_total()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
        UPDATE donors 
        SET 
            total_donated = total_donated + NEW.amount,
            last_donation_date = NEW.donated_at::date,
            first_donation_date = COALESCE(first_donation_date, NEW.donated_at::date),
            status = CASE WHEN status = 'prospect' THEN 'active' ELSE status END,
            updated_at = NOW()
        WHERE id = NEW.donor_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_donor_total
    AFTER INSERT OR UPDATE OF status ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_donor_total();

-- Function to update campaign raised_amount
CREATE OR REPLACE FUNCTION update_campaign_raised()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND NEW.campaign_id IS NOT NULL AND (OLD IS NULL OR OLD.status != 'completed') THEN
        UPDATE campaigns 
        SET 
            raised_amount = raised_amount + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.campaign_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_campaign_raised
    AFTER INSERT OR UPDATE OF status ON donations
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_raised();

-- Function to update volunteer hours_logged
CREATE OR REPLACE FUNCTION update_volunteer_hours()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
        UPDATE volunteers 
        SET 
            hours_logged = hours_logged + NEW.hours,
            updated_at = NOW()
        WHERE id = NEW.volunteer_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_volunteer_hours
    AFTER INSERT OR UPDATE OF status ON volunteer_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_volunteer_hours();
