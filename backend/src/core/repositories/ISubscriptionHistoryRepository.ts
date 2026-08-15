export interface SubscriptionHistoryRow {
  id: string;
  storeId: string;
  storeName: string | null;
  oldPlan: string | null;
  newPlan: string;
  oldStatus: string | null;
  newStatus: string | null;
  changedBy: string | null;
  changedByName: string | null;
  note: string | null;
  createdAt: string;
}

export interface CreateHistoryInput {
  storeId: string;
  storeName?: string;
  oldPlan?: string;
  newPlan: string;
  oldStatus?: string;
  newStatus?: string;
  changedBy?: string;
  changedByName?: string;
  note?: string;
}

export interface HistoryFilter {
  storeId?: string;
  page?: number;
  limit?: number;
}

export interface HistoryResult {
  items: SubscriptionHistoryRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ISubscriptionHistoryRepository {
  findAll(filter?: HistoryFilter): Promise<HistoryResult>;
  create(input: CreateHistoryInput): Promise<SubscriptionHistoryRow>;
}
