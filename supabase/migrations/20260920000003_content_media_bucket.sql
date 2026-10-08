-- =====================================================
-- NGO OS - CMS content-media bucket
-- The media library accepted hosted URLs only; editors had no way to
-- upload binaries. This public bucket (website imagery) follows the
-- established convention: <bucket>/<organization_id>/<file>, writes
-- gated on content.manage, public reads for the website.
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES
    ('content-media', 'content-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view content media" ON storage.objects;
CREATE POLICY "Public can view content media" ON storage.objects
    FOR SELECT TO anon, authenticated
    USING (bucket_id = 'content-media');

DROP POLICY IF EXISTS "Members upload content media" ON storage.objects;
CREATE POLICY "Members upload content media" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'content-media'
        AND public.user_has_permission(public.storage_org_id(name), 'content.manage')
    );

DROP POLICY IF EXISTS "Members update content media" ON storage.objects;
CREATE POLICY "Members update content media" ON storage.objects
    FOR UPDATE TO authenticated USING (
        bucket_id = 'content-media'
        AND public.user_has_permission(public.storage_org_id(name), 'content.manage')
    ) WITH CHECK (
        bucket_id = 'content-media'
        AND public.user_has_permission(public.storage_org_id(name), 'content.manage')
    );

DROP POLICY IF EXISTS "Members delete content media" ON storage.objects;
CREATE POLICY "Members delete content media" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'content-media'
        AND public.user_has_permission(public.storage_org_id(name), 'content.manage')
    );
