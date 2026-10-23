-- ============================================================
-- BizFlow 3D – Add 'stripe' to orders.payment_method check constraint
-- Migration 009
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop any existing check constraint on payment_method column in orders table
    FOR r IN (
        SELECT conname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'orders'::regclass
          AND c.contype = 'c'
          AND a.attname = 'payment_method'
    ) LOOP
        EXECUTE 'ALTER TABLE orders DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;

    -- Add updated check constraint with 'stripe'
    ALTER TABLE orders
      ADD CONSTRAINT orders_payment_method_check
      CHECK (payment_method IN ('cash', 'stripe', 'qr_code', 'debt'));
END $$;
