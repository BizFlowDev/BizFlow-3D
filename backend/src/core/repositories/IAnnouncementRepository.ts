export interface AnnouncementRow {
  id: string;
  title: string;
  content: string;
  createdBy: string | null;
  createdAt: string;
}

export interface IAnnouncementRepository {
  create(data: { title: string; content: string; createdBy: string | null }): Promise<AnnouncementRow>;
  findAll(limit?: number): Promise<AnnouncementRow[]>;
}
