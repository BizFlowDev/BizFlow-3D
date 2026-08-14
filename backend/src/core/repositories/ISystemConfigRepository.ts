export interface SystemConfigRow {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export interface ISystemConfigRepository {
  findAll(): Promise<SystemConfigRow[]>;
  findByKey(key: string): Promise<SystemConfigRow | null>;
  upsert(key: string, value: string, updatedBy: string | null): Promise<void>;
}
