import { ITemplateRepository, ReportTemplateRow } from '../../../core/repositories/ITemplateRepository.js';
import { query } from '../connection.js';

function mapRow(row: any): ReportTemplateRow {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    fileUrl: row.file_url,
    isActive: row.is_active,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export class PostgresTemplateRepository implements ITemplateRepository {
  async create(data: {
    name: string;
    version: string | null;
    fileUrl: string;
    updatedBy: string | null;
  }): Promise<ReportTemplateRow> {
    const res = await query(
      `INSERT INTO report_templates (name, version, file_url, updated_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.name, data.version, data.fileUrl, data.updatedBy],
    );
    return mapRow(res.rows[0]);
  }

  async findAll(): Promise<ReportTemplateRow[]> {
    const res = await query(
      `SELECT *
       FROM report_templates
       ORDER BY updated_at DESC`,
    );
    return res.rows.map(mapRow);
  }
}
