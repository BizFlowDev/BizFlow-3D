-- ============================================================
-- BizFlow 3D - Initial Database Schema
-- PostgreSQL Migration for Neon
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLES
-- ============================================================

-- a. stores
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    tax_code VARCHAR(50),
    subscription_plan VARCHAR(20) NOT NULL DEFAULT 'basic'
        CHECK (subscription_plan IN ('basic', 'professional')),
    subscription_status VARCHAR(20) NOT NULL DEFAULT 'trial'
        CHECK (subscription_status IN ('active', 'expired', 'trial')),
    subscription_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- b. users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'employee'
        CHECK (role IN ('owner', 'employee', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, email)
);

-- c. product_categories
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- d. products
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    description TEXT,
    has_multiple_units BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(store_id, code)
);

-- e. product_units
CREATE TABLE IF NOT EXISTS product_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit_name VARCHAR(50) NOT NULL,
    conversion_factor DECIMAL(10,4) NOT NULL DEFAULT 1,
    price DECIMAL(12,0) NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- f. customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    debt_balance DECIMAL(12,0) NOT NULL DEFAULT 0,
    note TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- g. orders
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    order_type VARCHAR(20) NOT NULL DEFAULT 'counter'
        CHECK (order_type IN ('counter', 'ai_generated')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'confirmed', 'cancelled')),
    total_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    final_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    debt_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    note TEXT,
    created_by_ai BOOLEAN NOT NULL DEFAULT false,
    ai_raw_input TEXT,
    confirmed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- h. order_items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,0) NOT NULL DEFAULT 0,
    total_price DECIMAL(12,0) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- i. inventory_transactions
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_unit_id UUID REFERENCES product_units(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL
        CHECK (type IN ('import', 'export', 'adjustment')),
    quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
    reference_type VARCHAR(20)
        CHECK (reference_type IN ('order', 'purchase', 'adjustment')),
    reference_id UUID,
    note TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- j. debt_payments
CREATE TABLE IF NOT EXISTS debt_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
        CHECK (payment_method IN ('cash', 'transfer')),
    note TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- k. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL
        CHECK (action IN ('create', 'update', 'delete')),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- l. system_configs
CREATE TABLE IF NOT EXISTS system_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_store_created
    ON orders(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_store_name
    ON products(store_id, name);

CREATE INDEX IF NOT EXISTS idx_customers_store_phone
    ON customers(store_id, phone);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action
    ON audit_logs(user_id, action);

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_category ON products(store_id, category_id);
CREATE INDEX IF NOT EXISTS idx_product_units_product_id ON product_units(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_store_product ON inventory_transactions(store_id, product_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_customer_id ON debt_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- 3. FUNCTION: Update customer debt_balance
-- ============================================================

CREATE OR REPLACE FUNCTION update_customer_debt_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE customers
        SET debt_balance = debt_balance - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.customer_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE customers
        SET debt_balance = debt_balance + OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.customer_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE customers
        SET debt_balance = debt_balance + OLD.amount - NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.customer_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. TRIGGER: Auto-update debt_balance on debt_payments changes
-- ============================================================

DROP TRIGGER IF EXISTS trg_debt_payment_update_balance ON debt_payments;
CREATE TRIGGER trg_debt_payment_update_balance
    AFTER INSERT OR UPDATE OR DELETE ON debt_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_debt_balance();

-- ============================================================
-- 4. VIEWS
-- ============================================================

-- vw_daily_revenue
CREATE OR REPLACE VIEW vw_daily_revenue AS
SELECT
    store_id,
    DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS date,
    COALESCE(SUM(final_amount), 0) AS total_revenue,
    COUNT(*) AS order_count
FROM orders
WHERE status = 'confirmed'
GROUP BY store_id, DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
ORDER BY store_id, date DESC;

-- vw_top_products
CREATE OR REPLACE VIEW vw_top_products AS
SELECT
    p.store_id,
    p.id AS product_id,
    p.code,
    p.name,
    pc.name AS category_name,
    COALESCE(SUM(oi.quantity), 0) AS total_quantity_sold,
    COALESCE(SUM(oi.total_price), 0) AS total_revenue,
    COUNT(DISTINCT oi.order_id) AS order_count
FROM products p
LEFT JOIN product_categories pc ON pc.id = p.category_id
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'confirmed'
GROUP BY p.store_id, p.id, p.code, p.name, pc.name
ORDER BY total_revenue DESC;

-- vw_customer_debt_summary
CREATE OR REPLACE VIEW vw_customer_debt_summary AS
SELECT
    c.store_id,
    c.id AS customer_id,
    c.name,
    c.phone,
    c.debt_balance AS current_debt,
    COALESCE(paid.total_paid, 0) AS total_paid,
    COALESCE(debt.total_debt, 0) AS total_debt_created,
    COALESCE(debt.total_debt, 0) - COALESCE(paid.total_paid, 0) AS remaining_debt
FROM customers c
LEFT JOIN (
    SELECT customer_id, COALESCE(SUM(amount), 0) AS total_paid
    FROM debt_payments
    GROUP BY customer_id
) paid ON paid.customer_id = c.id
LEFT JOIN (
    SELECT customer_id, COALESCE(SUM(debt_amount), 0) AS total_debt
    FROM orders
    WHERE status = 'confirmed' AND debt_amount > 0
    GROUP BY customer_id
) debt ON debt.customer_id = c.id;

-- ============================================================
-- 5. SEED DATA
-- ============================================================

-- Insert default system configs
INSERT INTO system_configs (key, value, description) VALUES
    ('store.default_currency', '"VND"', 'Default currency for stores'),
    ('order.default_status', '"draft"', 'Default status for new orders'),
    ('inventory.default_unit', '"cai"', 'Default inventory unit name'),
    ('app.name', '"BizFlow 3D"', 'Application name'),
    ('app.version', '"1.0.0"', 'Application version')
ON CONFLICT (key) DO NOTHING;

-- Insert admin user (no store - null store_id)
-- Password hash for "Admin@123" generated with bcryptjs
INSERT INTO users (id, store_id, full_name, email, phone, password_hash, role, is_active)
VALUES (
    gen_random_uuid(),
    NULL,
    'System Admin',
    'admin@bizflow.com',
    '0900000000',
    '$2b$10$4VvuS12ofF6nwqYbyRosve4CSeZspg05vpg.F/tJXjlXBznYe8awe',
    'admin',
    true
) ON CONFLICT DO NOTHING;

-- Insert sample store
INSERT INTO stores (id, name, address, phone, email, tax_code, subscription_plan, subscription_status, subscription_expires_at)
VALUES (
    gen_random_uuid(),
    'Cửa hàng mẫu BizFlow',
    '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    '02812345678',
    'store@bizflow.com',
    '1234567890',
    'professional',
    'active',
    NOW() + INTERVAL '1 year'
) ON CONFLICT DO NOTHING;

-- Insert owner account for the sample store
INSERT INTO users (id, store_id, full_name, email, phone, password_hash, role, is_active)
SELECT
    gen_random_uuid(),
    s.id,
    'Chủ cửa hàng',
    'owner@bizflow.com',
    '0909123456',
    '$2b$10$4VvuS12ofF6nwqYbyRosve4CSeZspg05vpg.F/tJXjlXBznYe8awe',
    'owner',
    true
FROM stores s
WHERE s.name = 'Cửa hàng mẫu BizFlow'
ON CONFLICT DO NOTHING;

-- Insert sample product categories for the sample store
INSERT INTO product_categories (id, store_id, name, description)
SELECT
    gen_random_uuid(),
    s.id,
    c.name,
    c.description
FROM stores s
CROSS JOIN (VALUES
    ('Thời trang', 'Quần áo, phụ kiện thời trang'),
    ('Điện tử', 'Thiết bị điện tử, linh kiện'),
    ('Thực phẩm', 'Đồ ăn, thức uống, thực phẩm khô'),
    ('Đồ gia dụng', 'Dụng cụ nhà bếp, đồ dùng gia đình'),
    ('Mỹ phẩm', 'Mỹ phẩm, chăm sóc da, nước hoa')
) AS c(name, description)
WHERE s.name = 'Cửa hàng mẫu BizFlow'
ON CONFLICT DO NOTHING;

-- Update timestamps trigger helper
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
DECLARE
    tables_with_updated_at TEXT[] := ARRAY['stores', 'users', 'product_categories', 'products', 'customers', 'orders'];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables_with_updated_at
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s; CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
            t, t, t, t
        );
    END LOOP;
END;
$$;
