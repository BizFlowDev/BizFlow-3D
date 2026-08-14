import { IAnnouncementRepository, AnnouncementRow } from '../../../core/repositories/IAnnouncementRepository.js';
import { query } from '../connection.js';

function mapRow(row: any): AnnouncementRow {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    createdBy: row.created_by_name ?? null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export class PostgresAnnouncementRepository implements IAnnouncementRepository {
  async create(data: { title: string; content: string; createdBy: string | null }): Promise<AnnouncementRow> {
    const res = await query(
      `INSERT INTO announcements (title, content, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, title, content, created_at`,
      [data.title, data.content, data.createdBy],
    );
    return mapRow({ ...res.rows[0], created_by_name: null });
  }

  async findAll(limit = 50): Promise<AnnouncementRow[]> {
    const res = await query(
      `SELECT a.id, a.title, a.content, a.created_at, u.full_name AS created_by_name
       FROM announcements a
       LEFT JOIN users u ON u.id = a.created_by
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit],
    );
    return res.rows.map(mapRow);
  }
}
