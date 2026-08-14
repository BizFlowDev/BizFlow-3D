import { ISystemConfigRepository, SystemConfigRow } from '../../../core/repositories/ISystemConfigRepository.js';
import { query } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

/** `system_configs.value` is JSONB — flatten it to a displayable string. */
function extractValue(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  if (raw === null || raw === undefined) return '';
  return JSON.stringify(raw);
}

function mapRow(row: any): SystemConfigRow {
  const camel = mapToCamelCase(row);
  return {
    id: camel.id,
    key: camel.key,
    value: extractValue(camel.value),
    description: camel.description,
    updatedAt: new Date(camel.updatedAt).toISOString(),
  };
}

export class PostgresSystemConfigRepository implements ISystemConfigRepository {
  async findAll(): Promise<SystemConfigRow[]> {
    const res = await query(
      `SELECT id, key, value, description, updated_at
       FROM system_configs
       ORDER BY key ASC`,
    );
    return res.rows.map(mapRow);
  }

  async findByKey(key: string): Promise<SystemConfigRow | null> {
    const res = await query(
      `SELECT id, key, value, description, updated_at
       FROM system_configs
       WHERE key = $1`,
      [key],
    );
    if (res.rowCount === 0) return null;
    return mapRow(res.rows[0]);
  }

  async upsert(key: string, value: string, updatedBy: string | null): Promise<void> {
    await query(
      `INSERT INTO system_configs (key, value, description, updated_by, updated_at)
       VALUES ($1, $2::jsonb, NULL, $3, NOW())
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()`,
      [key, JSON.stringify(value), updatedBy],
    );
  }
}
