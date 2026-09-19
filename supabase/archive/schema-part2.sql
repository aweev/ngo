-- =====================================================
-- NGO OS - Supabase Database Schema (Part 2)
-- Volunteers, Partners, Donors, Donations
-- =====================================================

-- =====================================================
-- VOLUNTEERS
-- =====================================================
CREATE TABLE volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    address TEXT,
    city TEXT,
    country TEXT,
    skills TEXT[] NOT NULL DEFAULT '{}',
    interests TEXT[] NOT NULL DEFAULT '{}',
    availability JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending', 'on_break')),
    background_check_status TEXT NOT NULL DEFAULT 'pending' CHECK (background_check_status IN ('pending', 'approved', 'rejected', 'not_required')),
    background_check_date DATE,
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours_logged DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    emergency_contact JSONB,
    documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- VOLUNTEER HOURS LOG
-- =====================================================
CREATE TABLE volunteer_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    volunteer_id UUID NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
    project_id UUID,
    activity TEXT NOT NULL,
    hours DECIMAL(5, 2) NOT NULL CHECK (hours > 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PARTNERS
-- =====================================================
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('corporate', 'government', 'ngo', 'educational', 'individual', 'other')),
    contact_person TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    logo_url TEXT,
    partnership_type TEXT NOT NULL DEFAULT 'strategic' CHECK (partnership_type IN ('financial', 'in_kind', 'strategic', 'implementing', 'other')),
    status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('active', 'inactive', 'prospect', 'former')),
    start_date DATE,
    end_date DATE,
    contract_value DECIMAL(12, 2),
    currency TEXT NOT NULL DEFAULT 'EUR',
    description TEXT,
    notes TEXT,
    documents JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DONORS
-- =====================================================
CREATE TABLE donors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'corporate', 'foundation', 'government', 'anonymous')),
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    website TEXT,
    status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN ('active', 'inactive', 'prospect', 'lapsed')),
    first_donation_date DATE,
    last_donation_date DATE,
    total_donated DECIMAL(12, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'EUR',
    preferred_payment_method TEXT,
    communication_preferences JSONB NOT NULL DEFAULT '{"email": true, "sms": false, "phone": false, "mail": false, "newsletter": true}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- DONATIONS
-- =====================================================
CREATE TABLE donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    donor_id UUID REFERENCES donors(id) ON DELETE SET NULL,
    campaign_id UUID,
    project_id UUID,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'EUR',
    type TEXT NOT NULL DEFAULT 'one_time' CHECK (type IN ('one_time', 'recurring', 'in_kind', 'legacy')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    payment_method TEXT,
    payment_reference TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    dedication TEXT,
    notes TEXT,
    donated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
