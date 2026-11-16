import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';
import env from '../../config';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { PoolClient } from 'pg';

const transactionClient = new AsyncLocalStorage<PoolClient>();

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const config: PoolConfig = {
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    if (env.isProd) {
      config.ssl = { rejectUnauthorized: true };
    } else {
      config.ssl = { rejectUnauthorized: false };
    }

    pool = new Pool(config);

    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err);
    });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const active = transactionClient.getStore();
  if (active) return active.query<T>(text, params);
  const client = await getPool().connect();
  try {
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  fn: (query: (text: string, params?: any[]) => Promise<QueryResult>) => Promise<T>
): Promise<T> {
  const active = transactionClient.getStore();
  if (active) return fn((text, params) => active.query(text, params));
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await transactionClient.run(client, () => fn((text, params) => client.query(text, params)));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export default { getPool, query, transaction, closePool };
