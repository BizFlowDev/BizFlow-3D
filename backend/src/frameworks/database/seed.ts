import bcrypt from 'bcryptjs';
import { query, closePool } from './connection';

async function seed(): Promise<void> {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const systemConfigs = [
    { key: 'store.default_currency', value: JSON.stringify('VND'), description: 'Default currency for stores' },
    { key: 'app.name', value: JSON.stringify('BizFlow 3D'), description: 'Application name' },
  ];

  for (const cfg of systemConfigs) {
    await query(
      `INSERT INTO system_configs (key, value, description)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO NOTHING`,
      [cfg.key, cfg.value, cfg.description]
    );
  }
  console.log('  ✓ System configs seeded.');

  const adminResult = await query(
    `INSERT INTO users (store_id, full_name, email, phone, password_hash, role, is_active)
     VALUES (NULL, 'System Admin', 'admin@bizflow.com', '0900000000', $1, 'admin', true)
     ON CONFLICT (store_id, email) DO NOTHING
     RETURNING id`,
    [hashedPassword]
  );
  if (adminResult.rowCount && adminResult.rowCount > 0) {
    console.log('  ✓ Admin account created (admin@bizflow.com / Admin@123).');
  } else {
    console.log('  - Admin account already exists, skipped.');
  }

  const storeResult = await query(
    `INSERT INTO stores (name, address, phone, email, tax_code, subscription_plan, subscription_status, subscription_expires_at)
     VALUES ('Cửa hàng mẫu BizFlow', '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh', '02812345678', 'store@bizflow.com', '1234567890', 'professional', 'active', NOW() + INTERVAL '1 year')
     ON CONFLICT DO NOTHING
     RETURNING id`,
  );
  if (storeResult.rowCount && storeResult.rowCount > 0) {
    console.log('  ✓ Sample store created.');
  } else {
    console.log('  - Sample store already exists, skipped.');
  }

  const storeRows = await query<{ id: string }>('SELECT id FROM stores WHERE name = $1', ['Cửa hàng mẫu BizFlow']);
  if (storeRows.rows.length > 0) {
    const storeId = storeRows.rows[0].id;

    await query(
      `INSERT INTO users (store_id, full_name, email, phone, password_hash, role, is_active)
       VALUES ($1, 'Chủ cửa hàng', 'owner@bizflow.com', '0909123456', $2, 'owner', true)
       ON CONFLICT (store_id, email) DO NOTHING`,
      [storeId, hashedPassword]
    );
    console.log('  ✓ Owner account created (owner@bizflow.com / Admin@123).');

    const categories = [
      { name: 'Thời trang', description: 'Quần áo, phụ kiện thời trang' },
      { name: 'Điện tử', description: 'Thiết bị điện tử, linh kiện' },
      { name: 'Thực phẩm', description: 'Đồ ăn, thức uống, thực phẩm khô' },
      { name: 'Đồ gia dụng', description: 'Dụng cụ nhà bếp, đồ dùng gia đình' },
      { name: 'Mỹ phẩm', description: 'Mỹ phẩm, chăm sóc da, nước hoa' },
    ];

    for (const cat of categories) {
      await query(
        `INSERT INTO product_categories (store_id, name, description)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [storeId, cat.name, cat.description]
      );
    }
    console.log('  ✓ Sample product categories created.');
  }

  console.log('Seeding completed.');
  await closePool();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
