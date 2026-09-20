-- =====================================================
-- NGO OS - Receipt columns for donations
-- Adds receipt_url and tax_receipt_url columns to support
-- email receipt generation on payment completion.
-- =====================================================

ALTER TABLE donations
    ADD COLUMN IF NOT EXISTS receipt_url TEXT,
    ADD COLUMN IF NOT EXISTS tax_receipt_url TEXT;

CREATE INDEX IF NOT EXISTS idx_donations_receipt ON donations(receipt_url) WHERE receipt_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donations_tax_receipt ON donations(tax_receipt_url) WHERE tax_receipt_url IS NOT NULL;
