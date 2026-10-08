-- =====================================================
-- NGO OS - WhatsApp / SMS field-report intake (audit Wave 0, item 2)
--
-- The previous endpoint accepted anonymous free text and wrote straight into
-- `impact_measurements`, so anyone who knew the URL could poison impact data
-- for every organization. This migration replaces that with a quarantined
-- intake pipeline:
--
--   field_report_senders     who is allowed to report (phone -> org/worker),
--                            explicitly approved, revocable.
--   field_reports            structured reports in a validation state. A
--                            report NEVER becomes a metric by itself -- only
--                            `promote_field_report()` (impact.manage) can
--                            create the measurement, and it is idempotent.
--   whatsapp_webhook_events  replay protection + delivery forensics. Only a
--                            SHA-256 digest of the payload is retained for
--                            rejected traffic (data minimisation).
--
-- Wave 1 extends this into the full evidence/verification model; Wave 0's
-- requirement is that nothing unverified can reach a production metric.
-- =====================================================

-- -----------------------------------------------------
-- 1. Approved field reporters
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS field_report_senders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    -- E.164 is the only stable identity for an inbound SMS; a number that maps
    -- to two organizations would make attribution ambiguous, so it is unique.
    phone_number_e164 TEXT NOT NULL UNIQUE,
    display_name TEXT,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    default_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_report_senders_org
    ON field_report_senders(organization_id, status);

-- -----------------------------------------------------
-- 2. Quarantined reports
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS field_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES field_report_senders(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    metric_id UUID REFERENCES impact_metrics(id) ON DELETE SET NULL,
    -- Twilio message id + a derived idempotency key: the same inbound message
    -- can never create two reports.
    message_sid TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    project_code TEXT NOT NULL DEFAULT 'unresolved',
    metric_code TEXT NOT NULL DEFAULT 'unresolved',
    -- Nullable on purpose: an unreadable message is quarantined raw, without a
    -- guessed number. A present value must still be a real positive quantity.
    quantity DECIMAL(15,4) CHECK (quantity IS NULL OR quantity > 0),
    location TEXT NOT NULL DEFAULT 'unresolved',
    note TEXT,
    raw_text TEXT NOT NULL,
    from_number TEXT NOT NULL,
    validation_state TEXT NOT NULL DEFAULT 'quarantined'
        CHECK (validation_state IN ('quarantined', 'pending_review', 'verified', 'rejected', 'promoted')),
    validation_reason TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    promoted_measurement_id UUID REFERENCES impact_measurements(id) ON DELETE SET NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_reports_org_state
    ON field_reports(organization_id, validation_state, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_reports_metric
    ON field_reports(metric_id, validation_state);


-- -----------------------------------------------------
-- 3. Webhook delivery log (replay protection + forensics)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Nullable: some Twilio callbacks omit MessageSid. NULLs never collide in
    -- a UNIQUE index, so unsigned/partial traffic is still recorded.
    message_sid TEXT UNIQUE,
    from_number TEXT,
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    -- accepted | quarantined | duplicate | rejected_signature | unknown_sender
    -- | invalid_payload | not_configured | error
    outcome TEXT NOT NULL,
    http_status INTEGER,
    detail TEXT,
    -- SHA-256 of the raw request body: replay evidence without storing PII.
    payload_digest TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_events_received
    ON whatsapp_webhook_events(received_at DESC);

-- -----------------------------------------------------
-- 4. Triggers: updated_at + org immutability
-- -----------------------------------------------------
DROP TRIGGER IF EXISTS update_field_report_senders_updated_at ON field_report_senders;
CREATE TRIGGER update_field_report_senders_updated_at
    BEFORE UPDATE ON field_report_senders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_field_reports_updated_at ON field_reports;
CREATE TRIGGER update_field_reports_updated_at
    BEFORE UPDATE ON field_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_prevent_org_change ON field_report_senders;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON field_report_senders
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

DROP TRIGGER IF EXISTS trg_prevent_org_change ON field_reports;
CREATE TRIGGER trg_prevent_org_change
    BEFORE UPDATE ON field_reports
    FOR EACH ROW EXECUTE FUNCTION public.prevent_org_change();

-- -----------------------------------------------------
-- 5. Promotion: the ONLY path from a report to a metric
-- -----------------------------------------------------
-- Requires impact.manage, an explicit pending_review/verified state and a
-- resolved metric. Idempotent: promoting twice returns the same measurement
-- instead of double-counting. Every promotion is written to audit_logs.
CREATE OR REPLACE FUNCTION public.promote_field_report(p_report_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report field_reports%ROWTYPE;
    v_measurement_id uuid;
BEGIN
    SELECT * INTO v_report FROM field_reports WHERE id = p_report_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Field report not found.';
    END IF;

    IF NOT public.user_has_permission(v_report.organization_id, 'impact.manage') THEN
        RAISE EXCEPTION 'Requires impact.manage to promote a field report.';
    END IF;

    IF v_report.promoted_measurement_id IS NOT NULL THEN
        RETURN v_report.promoted_measurement_id;
    END IF;

    IF v_report.validation_state NOT IN ('pending_review', 'verified') THEN
        RAISE EXCEPTION 'Only pending_review or verified reports can be promoted (current: %).',
            v_report.validation_state;
    END IF;

    IF v_report.metric_id IS NULL THEN
        RAISE EXCEPTION 'Report has no resolved metric; resolve the metric code before promoting.';
    END IF;

    INSERT INTO impact_measurements (
        organization_id, metric_id, value, measured_at, notes, data_source, verified_by
    ) VALUES (
        v_report.organization_id,
        v_report.metric_id,
        v_report.quantity,
        v_report.received_at::date,
        'WhatsApp field report ' || v_report.message_sid || ' at ' || v_report.location
            || CASE WHEN v_report.note IS NULL THEN '' ELSE ' (' || v_report.note || ')' END,
        'whatsapp_field_bridge',
        auth.uid()
    ) RETURNING id INTO v_measurement_id;

    UPDATE field_reports
       SET validation_state = 'promoted',
           promoted_measurement_id = v_measurement_id,
           reviewed_by = auth.uid(),
           reviewed_at = NOW()
     WHERE id = p_report_id;

    INSERT INTO audit_logs (
        organization_id, user_id, action, entity_type, entity_id, new_values
    ) VALUES (
        v_report.organization_id,
        auth.uid(),
        'field_report.promoted',
        'field_report',
        p_report_id,
        jsonb_build_object(
            'measurement_id', v_measurement_id,
            'metric_id', v_report.metric_id,
            'quantity', v_report.quantity,
            'received_at', v_report.received_at
        )
    );

    RETURN v_measurement_id;
END;
$$;

COMMENT ON FUNCTION public.promote_field_report(uuid) IS
    'Wave 0: the only path from an inbound field report to impact_measurements (impact.manage, idempotent, audited).';

-- -----------------------------------------------------
-- 6. RLS
-- -----------------------------------------------------
ALTER TABLE field_report_senders ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('field_report_senders', 'workers.read', 'workers.manage');

ALTER TABLE field_reports ENABLE ROW LEVEL SECURITY;
SELECT public.add_tenant_policies('field_reports', 'impact.read', 'impact.manage');

-- Webhook log is platform-level infrastructure: RLS on with no client policy
-- means only the service role (which bypasses RLS) can read or write it.
ALTER TABLE whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
