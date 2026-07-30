import { Customer } from '../entities/Customer.js';

export interface CustomerFilter {
  storeId: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ICustomerRepository {
  findById(id: string): Promise<Customer | null>;
  findByStoreId(storeId: string): Promise<Customer[]>;
  findByPhone(storeId: string, phone: string): Promise<Customer | null>;
  create(customer: Customer): Promise<Customer>;
  update(
    id: string,
    data: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'address' | 'note' | 'isActive'>>,
  ): Promise<Customer>;
  delete(id: string): Promise<void>;

  /** Update debt balance directly (triggered by DB trigger, but available for use case logic). */
  updateDebtBalance(id: string, amount: number): Promise<Customer>;

  /** Search customers with pagination. */
  search(filter: CustomerFilter): Promise<PaginatedResult<Customer>>;
}
