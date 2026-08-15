-- ============================================================
-- BizFlow 3D - Subscription Plans & History
-- Migration 004
-- ============================================================

-- ── subscription_plans ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(12,0) NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_employees INT NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    color_from VARCHAR(30) DEFAULT 'from-blue-500',
    color_to VARCHAR(30) DEFAULT 'to-cyan-500',
    icon VARCHAR(30) DEFAULT 'Zap',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── subscription_history ────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    store_name VARCHAR(255),
    old_plan VARCHAR(50),
    new_plan VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_by_name VARCHAR(255),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_store_id ON subscription_history(store_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at DESC);

-- ── Seed default plans ──────────────────────────────────────
INSERT INTO subscription_plans (name, slug, description, price, features, max_employees, sort_order, color_from, color_to, icon) VALUES
(
    'Basic', 'basic', 'Gói cơ bản cho cửa hàng nhỏ',
    199000,
    '["Tối đa 3 nhân viên","Quản lý sản phẩm cơ bản","Báo cáo doanh thu","Hỗ trợ qua email"]'::jsonb,
    3, 1, 'from-blue-500', 'to-cyan-500', 'Zap'
),
(
    'Professional', 'professional', 'Gói chuyên nghiệp đầy đủ tính năng',
    499000,
    '["Tối đa 20 nhân viên","AI Order Assistant","Kế toán Thông tư 88","3D Store View","Hỗ trợ ưu tiên 24/7","API mở rộng"]'::jsonb,
    20, 2, 'from-amber-500', 'to-orange-500', 'Crown'
)
ON CONFLICT (slug) DO NOTHING;

-- ── Remove rigid CHECK constraint to allow dynamic plan slugs ──
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_subscription_plan_check;
