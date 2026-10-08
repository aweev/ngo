-- =====================================================
-- NGO OS - Private trust-documents bucket (audit Wave 1)
--
-- The secure document model requires a PRIVATE bucket:
--   * no public SELECT policy — bytes are only reachable through
--     short-lived signed URLs issued by src/actions/documents.ts after
--     permission checks AND a clean malware scan (documents.scan_state)
--   * path convention <organization_id>/<document_id>/<file> keeps
--     tenant scoping enforceable via public.storage_org_id(name)
--   * writes mirror the documents/evidence_links RLS (audit.manage),
--     reads mirror audit.read
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES
    ('trust-documents', 'trust-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Members view trust documents" ON storage.objects;
CREATE POLICY "Members view trust documents" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'trust-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'audit.read')
    );

DROP POLICY IF EXISTS "Members upload trust documents" ON storage.objects;
CREATE POLICY "Members upload trust documents" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (
        bucket_id = 'trust-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'audit.manage')
    );

-- Evidence-grade objects are immutable: no UPDATE policy on purpose.
-- Corrections upload a new document and append a new evidence link.

DROP POLICY IF EXISTS "Members delete trust documents" ON storage.objects;
CREATE POLICY "Members delete trust documents" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'trust-documents'
        AND public.user_has_permission(public.storage_org_id(name), 'audit.manage')
    );

COMMENT ON POLICY "Members view trust documents" ON storage.objects IS
    'Wave 1: private evidence bucket; the browser normally never hits this directly — server actions issue signed URLs after a clean malware scan.';
