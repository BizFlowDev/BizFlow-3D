import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const storeId = 'feef8dd8-d9ea-44a8-8f3d-96787383c852';
  const orders = await pool.query(`
    SELECT id, store_id, status, total_amount, final_amount, created_at,
           TO_CHAR(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI:SS') as vn_time
    FROM orders
    WHERE store_id = $1
    ORDER BY created_at DESC
  `, [storeId]);
  console.log('Orders for store:', orders.rows.length);
  console.log(orders.rows);

  const daily = await pool.query(`
    SELECT 
      TO_CHAR(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
      SUM(final_amount) AS "totalRevenue",
      COUNT(id) AS "orderCount"
    FROM orders
    WHERE store_id = $1 AND status = 'confirmed'
    GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')
    ORDER BY date DESC
  `, [storeId]);
  console.log('Daily revenue for store:', daily.rows);

  await pool.end();
}

check().catch(console.error);
