import { Customer } from '../../entities/Customer.js';
import { ICustomerRepository, CustomerFilter, PaginatedResult } from '../../repositories/ICustomerRepository.js';

export interface ListCustomersInput {
  storeId: string;
  isActive?: boolean;
  search?: string;
  filter?: 'all' | 'has_debt' | 'no_debt' | 'overdue';
  page?: number;
  limit?: number;
}

export class ListCustomersUseCase {
  constructor(private readonly customerRepo: ICustomerRepository) {}

  async execute(input: ListCustomersInput): Promise<PaginatedResult<Customer>> {
    const filter: CustomerFilter = {
      storeId: input.storeId,
      isActive: input.isActive,
      search: input.search,
      filter: input.filter,
      page: input.page ?? 1,
      limit: Math.min(input.limit ?? 20, 100),
    };

    return this.customerRepo.search(filter);
  }
}
