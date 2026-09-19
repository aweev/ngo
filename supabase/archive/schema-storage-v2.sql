-- =====================================================
-- NGO OS - Secure Storage Buckets & Policies (Phase 2, item 19)
-- =====================================================
-- Replaces schema-storage.sql policies. Object paths follow the convention
--   <bucket>/<organization_id>/<entity-id>/<filename>
-- so access is scoped to the object's organization.
--
-- Public buckets  : organization-logos, project-images, campaign-images
--                    (anyone may read; only org members with the matching
--                     module permission may upload/update/delete)
-- Private buckets : worker-documents, volunteer-documents, partner-documents
--                    (only members of the owning org with module read may
--                     view; module manage to upload/update/delete)
--
-- Requires the helper functions from schema-rls-extended.sql
-- (user_has_permission / user_has_org_access).

-- Explicit re-creation of the buckets so the script is self-contained.
INSERT INTO storage.buckets (id, name, public) VALUES
    ('organization-logos', 'organization-logos', true),
    ('worker-documents', 'worker-documents', false),
    ('volunteer-documents', 'volunteer-documents', false),
    ('partner-documents', 'partner-documents', false),
    ('project-images', 'project-images', true),
    ('campaign-images', 'campaign-images', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 1. Drop all legacy (too permissive) storage policies
-- =====================================================
DROP POLICY IF EXISTS "Public can view organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload organization logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view worker documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload worker documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload volunteer documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view project images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload project images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view campaign images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload campaign images" ON storage.objects;

-- =====================================================
-- 2. Helper: organization id of a storage object
-- =====================================================
CREATE OR REPLACE FUNCTION public.storage_org_id(p_name text)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF((storage.foldername(p_name))[1], '')::uuid;
$$;

-- =====================================================
-- 3. Public buckets — anyone reads; members with module permission write
-- =====================================================
CREATE POLICY "Public can view public bucket objects" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id IN ('organization-logos', 'project-images', 'campaign-images'));

-- Upload / update requires membership + the matching manage permission.
CREATE POLICY "Members upload org logos" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'organization-logos'
        AND public.user_has_permission(public.storage_org_id(name), 'settings.manage')
    );
CREATE POLICY "Members upload project images" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'project-images'
        AND public.user_has_permission(public.storage_org_id(name), 'projects.manage')
    );

CREATE POLICY "Members update project images" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'project-images'
        AND public.user_has_permission(public.storage_org_id(name), 'projects.manage')
    ) WITH CHECK (
        bucket_id = 'project-images'
        AND public.user_has_permission(public.storage_org_id(name), 'projects.manage')
    );

CREATE POLICY "Members upload campaign images" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'campaign-images'
        AND public.user_has_permission(public.storage_org_id(name), 'campaigns.manage')
    );

CREATE POLICY "Members update campaign images" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'campaign-images'
        AND public.user_has_permission(public.storage_org_id(name), 'campaigns.manage')
    ) WITH CHECK (
        bucket_id = 'campaign-images'
        AND public.user_has_permission(public.storage_org_id(name), 'campaigns.manage')
    );

CREATE POLICY "Managers delete public bucket objects" ON storage.objects
    FOR DELETE TO authenticated USING (
        (bucket_id = 'organization-logos' AND public.user_has_permission(public.storage_org_id(name), 'settings.manage'))
        OR (bucket_id = 'project-images'   AND public.user_has_permission(public.storage_org_id(name), 'projects.manage'))
        OR (bucket_id = 'campaign-images'  AND public.user_has_permission(public.storage_org_id(name), 'campaigns.manage'))
-- =====================================================
-- 4. Private buckets — only members of the owning org with module read
-- =====================================================
CREATE POLICY "Staff view worker documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'worker-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'workers.read')
    );

CREATE POLICY "Staff upload worker documents" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'worker-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'workers.manage')
    );

CREATE POLICY "Staff manage worker documents" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'worker-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'workers.manage')
    ) WITH CHECK (
        bucket_id = 'worker-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'workers.manage')
    );

CREATE POLICY "Staff delete worker documents" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'worker-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'workers.manage')
    );

CREATE POLICY "Staff view volunteer documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'volunteer-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'volunteers.read')
    );

CREATE POLICY "Staff upload volunteer documents" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'volunteer-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'volunteers.manage')
    );

CREATE POLICY "Staff manage volunteer documents" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'volunteer-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'volunteers.manage')
    ) WITH CHECK (
        bucket_id = 'volunteer-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'volunteers.manage')
    );

CREATE POLICY "Staff delete volunteer documents" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'volunteer-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'volunteers.manage')
    );

CREATE POLICY "Staff view partner documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'partner-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'partners.read')
    );

CREATE POLICY "Staff upload partner documents" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'partner-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'partners.manage')
    );

CREATE POLICY "Staff manage partner documents" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'partner-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'partners.manage')
    ) WITH CHECK (
        bucket_id = 'partner-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'partners.manage')
    );

CREATE POLICY "Staff delete partner documents" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'partner-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'partners.manage')
    );

-- =====================================================
-- Done.
-- =====================================================
    );