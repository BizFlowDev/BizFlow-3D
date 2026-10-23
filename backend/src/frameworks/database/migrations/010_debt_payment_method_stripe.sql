-- ============================================================
-- BizFlow 3D – Add 'stripe' to debt_payments.payment_method check constraint
-- Migration 010
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop any existing check constraint on payment_method column in debt_payments table
    FOR r IN (
        SELECT conname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'debt_payments'::regclass
          AND c.contype = 'c'
          AND a.attname = 'payment_method'
    ) LOOP
        EXECUTE 'ALTER TABLE debt_payments DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;

    -- Add updated check constraint with 'stripe' included
    ALTER TABLE debt_payments
        ADD CONSTRAINT debt_payments_payment_method_check
        CHECK (payment_method IN ('cash', 'transfer', 'stripe'));
END $$;
