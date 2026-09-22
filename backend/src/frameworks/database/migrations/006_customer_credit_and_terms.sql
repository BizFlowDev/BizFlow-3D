-- ============================================================
-- BizFlow 3D – Customer Credit Limits & Payment Terms
-- Migration 006
-- ============================================================

-- ── 1. Customers: Hạn mức công nợ & Thời hạn thanh toán ─────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,0) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_term_days INT NOT NULL DEFAULT 30;

-- ── 2. Recreate vw_customer_debt_summary with subqueries ────
DROP VIEW IF EXISTS vw_customer_debt_summary;

CREATE VIEW vw_customer_debt_summary AS
SELECT
    c.store_id,
    c.id AS customer_id,
    c.name,
    c.phone,
    c.credit_limit,
    c.payment_term_days,
    c.debt_balance AS current_debt,
    COALESCE(paid.total_paid, 0) AS total_paid,
    COALESCE(debt.total_debt, 0) AS total_debt_created,
    COALESCE(debt.total_debt, 0) - COALESCE(paid.total_paid, 0) AS remaining_debt,
    debt.oldest_unpaid_date,
    CASE 
      WHEN c.debt_balance > 0 AND debt.oldest_unpaid_date IS NOT NULL THEN
        GREATEST(0, EXTRACT(DAY FROM (NOW() - (debt.oldest_unpaid_date + (c.payment_term_days || ' days')::INTERVAL)))::INT)
      ELSE 0
    END AS overdue_days
FROM customers c
LEFT JOIN (
    SELECT customer_id, COALESCE(SUM(amount), 0) AS total_paid
    FROM debt_payments
    GROUP BY customer_id
) paid ON paid.customer_id = c.id
LEFT JOIN (
    SELECT 
      customer_id, 
      COALESCE(SUM(debt_amount), 0) AS total_debt,
      MIN(created_at) AS oldest_unpaid_date
    FROM orders
    WHERE status = 'confirmed' AND debt_amount > 0
    GROUP BY customer_id
) debt ON debt.customer_id = c.id;
