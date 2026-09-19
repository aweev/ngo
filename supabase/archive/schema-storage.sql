-- =====================================================
-- NGO OS - Storage Buckets & Policies
-- =====================================================

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES
    ('organization-logos', 'organization-logos', true),
    ('worker-documents', 'worker-documents', false),
    ('volunteer-documents', 'volunteer-documents', false),
    ('partner-documents', 'partner-documents', false),
    ('project-images', 'project-images', true),
    ('campaign-images', 'campaign-images', true);

-- Storage policies for organization logos (public read)
CREATE POLICY "Public can view organization logos" ON storage.objects
    FOR SELECT USING (bucket_id = 'organization-logos');

CREATE POLICY "Authenticated users can upload organization logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'organization-logos' AND
        auth.role() = 'authenticated'
    );

-- Storage policies for worker documents (private)
CREATE POLICY "Authenticated users can view worker documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'worker-documents' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can upload worker documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'worker-documents' AND
        auth.role() = 'authenticated'
    );

-- Storage policies for volunteer documents (private)
CREATE POLICY "Authenticated users can view volunteer documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'volunteer-documents' AND
        auth.role() = 'authenticated'
    );

CREATE POLICY "Authenticated users can upload volunteer documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'volunteer-documents' AND
        auth.role() = 'authenticated'
    );

-- Storage policies for project images (public)
CREATE POLICY "Public can view project images" ON storage.objects
    FOR SELECT USING (bucket_id = 'project-images');

CREATE POLICY "Authenticated users can upload project images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project-images' AND
        auth.role() = 'authenticated'
    );
