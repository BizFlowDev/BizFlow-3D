export interface ReportTemplateRow {
  id: string;
  name: string;
  version: string | null;
  fileUrl: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface ITemplateRepository {
  create(data: {
    name: string;
    version: string | null;
    fileUrl: string;
    updatedBy: string | null;
  }): Promise<ReportTemplateRow>;
  findAll(): Promise<ReportTemplateRow[]>;
}
