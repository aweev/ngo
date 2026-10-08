-- =====================================================
-- NGO OS - Form definitions (admin-built forms)
-- The admin forms UI (list/new/detail + FormBuilder) and the
-- form_submissions triage filter on form_id have existed without
-- this table — every forms admin call failed at runtime.
-- =====================================================

CREATE TABLE IF NOT EXISTS form_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    submit_button_text TEXT NOT NULL DEFAULT 'Submit',
    success_message TEXT NOT NULL DEFAULT 'Thank you for your submission.',
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- Submissions triage filters on form_id; existing rows keep form_slug.
ALTER TABLE form_submissions
    ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES form_definitions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON form_submissions(form_id);

-- updated_at maintenance (same function as every other table).
DROP TRIGGER IF EXISTS update_form_definitions_updated_at ON form_definitions;
CREATE TRIGGER update_form_definitions_updated_at BEFORE UPDATE ON form_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- organization_id immutability (same guard as every tenant table).
DROP TRIGGER IF EXISTS trg_prevent_org_change ON form_definitions;
CREATE TRIGGER trg_prevent_org_change BEFORE UPDATE ON form_definitions
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

-- RLS: tenant policies via the shared generator (forms.read / forms.manage).
SELECT public.add_tenant_policies('form_definitions', 'forms.read', 'forms.manage');
