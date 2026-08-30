-- ============================================================
-- BizFlow 3D – Payment Methods & Store Bank Info
-- Migration 005
-- ============================================================

-- ── 1. Stores: thông tin ngân hàng nhận tiền (VietQR) ──────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS bank_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(255);

-- ── 2. Orders: phương thức thanh toán ──────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'qr_code', 'debt')),
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS change_amount DECIMAL(12,0) NOT NULL DEFAULT 0;

-- ── 3. Index for payment_method ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_payment_method
  ON orders(payment_method);
