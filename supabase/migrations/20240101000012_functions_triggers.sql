-- =====================================================
-- NGO OS - Core Functions & Triggers
-- Consolidated from legacy schema-triggers.sql
-- Gap repair: legacy triggers covered only the original 13
-- tables; this applies the updated_at trigger to every table
-- that has an updated_at column.
-- =====================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the updated_at trigger to every table that has the column
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.table_name
        FROM information_schema.columns c
        JOIN pg_class p ON p.relname = c.table_name
        JOIN pg_namespace n ON n.oid = p.relnamespace
        WHERE c.column_name = 'updated_at'
          AND n.nspname = 'public'
          AND c.table_schema = 'public'
          AND p.relkind = 'r'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;', r.table_name, r.table_name);
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', r.table_name, r.table_name);
    END LOOP;
END $$;

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

DROP TRIGGER IF EXISTS trigger_update_donor_total ON donations;
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

DROP TRIGGER IF EXISTS trigger_update_campaign_raised ON donations;
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

DROP TRIGGER IF EXISTS trigger_update_volunteer_hours ON volunteer_hours;
CREATE TRIGGER trigger_update_volunteer_hours
    AFTER INSERT OR UPDATE OF status ON volunteer_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_volunteer_hours();
