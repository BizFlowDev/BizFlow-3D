-- ============================================================
-- BizFlow 3D - Seed product categories & sample products
-- Idempotent: safe to re-run.
-- ============================================================

-- 1. Seed the 5 default product categories (only if missing for the store)
INSERT INTO product_categories (store_id, name, description)
SELECT s.id, c.name, c.description
FROM stores s
CROSS JOIN (VALUES
    ('Thời trang', 'Quần áo, phụ kiện thời trang'),
    ('Điện tử', 'Thiết bị điện tử, linh kiện'),
    ('Thực phẩm', 'Đồ ăn, thức uống, thực phẩm khô'),
    ('Đồ gia dụng', 'Dụng cụ nhà bếp, đồ dùng gia đình'),
    ('Mỹ phẩm', 'Mỹ phẩm, chăm sóc da, nước hoa')
) AS c(name, description)
WHERE s.name = 'Cửa hàng mẫu BizFlow'
  AND NOT EXISTS (
      SELECT 1 FROM product_categories pc
      WHERE pc.store_id = s.id AND pc.name = c.name
  );

-- 2. Seed sample products (only if the code does not exist for the store)
INSERT INTO products (store_id, category_id, code, name, description, image_url, has_multiple_units)
SELECT
    s.id,
    cat.id,
    p.code,
    p.name,
    p.description,
    p.image_url,
    p.has_multiple_units
FROM stores s
CROSS JOIN (VALUES
    ('SP-001', 'Điện tử', 'Bàn phím cơ Keychron K8', 'Bàn phím cơ 87 phím, switch Gateron, có dây', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=200&q=80', false),
    ('SP-002', 'Thời trang', 'Áo thun cotton', 'Áo thun cotton 100% thoáng mát, nhiều màu sắc', 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=200&q=80', true),
    ('SP-003', 'Thời trang', 'Quần jean slim', 'Quần jean slim fit chất liệu denim cao cấp', 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200&q=80', false),
    ('SP-004', 'Mỹ phẩm', 'Kem chống nắng SPF50', 'Kem chống nắng quang phổ rộng, không nhờn', 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&q=80', false),
    ('SP-005', 'Đồ gia dụng', 'Ấm siêu tốc 1.8L', 'Ấm siêu tốc inox 1.8L, tự ngắt an toàn', 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=200&q=80', false)
) AS p(code, category_name, name, description, image_url, has_multiple_units)
LEFT JOIN product_categories cat ON cat.store_id = s.id AND cat.name = p.category_name
WHERE s.name = 'Cửa hàng mẫu BizFlow'
  AND NOT EXISTS (
      SELECT 1 FROM products pr
      WHERE pr.store_id = s.id AND pr.code = p.code
  );

-- 3. Attach missing categories to products that already exist (e.g. SP-001)
UPDATE products pr
SET category_id = pc.id
FROM product_categories pc
WHERE pr.category_id IS NULL
  AND pc.store_id = pr.store_id
  AND pc.name = CASE pr.code
      WHEN 'SP-001' THEN 'Điện tử'
      WHEN 'SP-002' THEN 'Thời trang'
      WHEN 'SP-003' THEN 'Thời trang'
      WHEN 'SP-004' THEN 'Mỹ phẩm'
      WHEN 'SP-005' THEN 'Đồ gia dụng'
      ELSE NULL
  END;

-- 4. Seed product units for the sample products (idempotent per product + unit name)
INSERT INTO product_units (product_id, unit_name, conversion_factor, price, is_default)
SELECT pr.id, u.unit_name, u.conversion_factor, u.price, u.is_default
FROM products pr
CROSS JOIN (VALUES
    ('SP-001', 'Cái', 1, 1850000, true),
    ('SP-002', 'Cái', 1, 150000, true),
    ('SP-002', 'Lố (10 cái)', 10, 1350000, false),
    ('SP-003', 'Cái', 1, 420000, true),
    ('SP-004', 'Chai', 1, 250000, true),
    ('SP-005', 'Cái', 1, 350000, true)
) AS u(code, unit_name, conversion_factor, price, is_default)
WHERE u.code = pr.code
  AND NOT EXISTS (
    SELECT 1 FROM product_units pu
    WHERE pu.product_id = pr.id AND pu.unit_name = u.unit_name
);
