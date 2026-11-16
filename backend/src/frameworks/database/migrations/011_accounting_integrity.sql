-- Additive: existing journal entries are deliberately left untouched.
CREATE TABLE IF NOT EXISTS accounting_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  reference_type VARCHAR(30) NOT NULL CHECK (reference_type IN ('order', 'inventory_import', 'debt_payment')),
  reference_id UUID NOT NULL,
  entry_date TIMESTAMPTZ NOT NULL,
  cost_status VARCHAR(10) NOT NULL CHECK (cost_status IN ('complete', 'estimated', 'missing')),
  missing_product_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, reference_type, reference_id)
);
CREATE INDEX IF NOT EXISTS idx_accounting_postings_store_date ON accounting_postings(store_id, entry_date);
