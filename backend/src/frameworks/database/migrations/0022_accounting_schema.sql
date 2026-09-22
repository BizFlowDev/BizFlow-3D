-- ============================================================
-- BizFlow 3D - Accounting Schema
-- Bảng hạch toán tự động (AutoPosting) + Danh mục tài khoản
-- Theo chế độ kế toán doanh nghiệp nhỏ và vừa (Thông tư 88/2021/TT-BTC)
-- ============================================================

-- ============================================================
-- 1. account_chart: Danh mục tài khoản kế toán
-- ============================================================
CREATE TABLE IF NOT EXISTS account_chart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(20) NOT NULL
        CHECK (account_type IN ('asset', 'liability', 'equity', 'expense', 'revenue')),
    parent_code VARCHAR(10),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. accounting_entries: Sổ cái / bút toán hạch toán tự động
-- ============================================================
CREATE TABLE IF NOT EXISTS accounting_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    account_code VARCHAR(10) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    debit_amount DECIMAL(16,0) NOT NULL DEFAULT 0,
    credit_amount DECIMAL(16,0) NOT NULL DEFAULT 0,
    reference_type VARCHAR(30) NOT NULL
        CHECK (reference_type IN ('order', 'inventory_import', 'debt_payment')),
    reference_id UUID NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_accounting_entries_store_date
    ON accounting_entries(store_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_reference
    ON accounting_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_account
    ON accounting_entries(account_code);

-- ============================================================
-- 4. SEED: Danh mục tài khoản theo Thông tư 88/2021/TT-BTC (rút gọn cho hộ KD)
-- ============================================================
INSERT INTO account_chart (code, name, account_type) VALUES
    ('111', 'Tiền mặt', 'asset'),
    ('112', 'Tiền gửi ngân hàng', 'asset'),
    ('131', 'Phải thu của khách hàng', 'asset'),
    ('152', 'Nguyên vật liệu', 'asset'),
    ('156', 'Hàng hóa', 'asset'),
    ('331', 'Phải trả cho người bán', 'liability'),
    ('421', 'Lợi nhuận chưa phân phối', 'equity'),
    ('511', 'Doanh thu bán hàng và cung cấp dịch vụ', 'revenue'),
    ('632', 'Giá vốn hàng bán', 'expense'),
    ('641', 'Chi phí bán hàng', 'expense'),
    ('642', 'Chi phí quản lý doanh nghiệp', 'expense'),
    ('911', 'Xác định kết quả kinh doanh', 'expense')
ON CONFLICT (code) DO NOTHING;