import fs from 'fs';
import path from 'path';
import { getPool, closePool } from './connection';

async function migrate(): Promise<void> {
  const pool = getPool();
  const migrationsDir = path.resolve(__dirname, 'migrations');

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    await closePool();
    return;
  }

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`Running migration: ${file}...`);
    try {
      await pool.query(sql);
      console.log(`  ✓ ${file} completed successfully.`);
    } catch (err: any) {
      console.error(`  ✗ ${file} failed:`, err.message);
      console.error('Migration aborted.');
      process.exit(1);
    }
  }

  console.log('All migrations completed.');
  await closePool();
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
