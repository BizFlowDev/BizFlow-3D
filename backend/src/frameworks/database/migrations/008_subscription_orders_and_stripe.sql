-- ============================================================
-- BizFlow 3D - Subscription Orders & Stripe Integration
-- Migration 008
-- ============================================================

-- ── 1. Stores: bo sung stripe_customer_id ───────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100);

-- ── 2. subscription_orders ─────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
    plan_slug VARCHAR(50) NOT NULL,
    duration_months INT NOT NULL DEFAULT 1,
    amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'vnd',
    payment_method VARCHAR(30) NOT NULL DEFAULT 'stripe',
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed', 'expired', 'cancelled')),
    stripe_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    checkout_url TEXT,
    qr_code_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subscription_orders_store_id ON subscription_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_stripe_session_id ON subscription_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_status ON subscription_orders(status);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_created_at ON subscription_orders(created_at DESC);
