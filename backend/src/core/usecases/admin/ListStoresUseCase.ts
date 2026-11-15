import { IStoreRepository, AdminStoreResult } from '../../repositories/IStoreRepository.js';

export interface ListStoresFilter {
  search?: string;
  status?: 'active' | 'expired' | 'trial' | 'locked' | 'all';
  plan?: string | 'all';
  page?: number;
  limit?: number;
}

/**
 * Admin: paginated store list with search + status/plan filters.
 */
export class ListStoresUseCase {
  constructor(private readonly storeRepo: IStoreRepository) {}

  async execute(filter: ListStoresFilter): Promise<AdminStoreResult> {
    return this.storeRepo.searchAdmin({
      search: filter.search || undefined,
      status:
        filter.status && filter.status !== 'all' ? filter.status : undefined,
      plan: filter.plan && filter.plan !== 'all' ? filter.plan : undefined,
      page: filter.page ?? 1,
      limit: filter.limit ?? 10,
    });
  }
}
