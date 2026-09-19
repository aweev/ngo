-- =====================================================
-- NGO OS - People Tables (Volunteers, Volunteer Hours)
-- =====================================================

CREATE TABLE IF NOT EXISTS volunteers (
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

CREATE TABLE IF NOT EXISTS volunteer_hours (
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
