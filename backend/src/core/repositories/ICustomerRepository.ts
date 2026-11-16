import { Customer } from '../entities/Customer.js';

export interface CustomerFilter {
  storeId: string;
  isActive?: boolean;
  search?: string;
  filter?: 'all' | 'has_debt' | 'no_debt' | 'overdue';
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
    data: Partial<Pick<Customer, 'name' | 'phone' | 'email' | 'address' | 'note' | 'creditLimit' | 'paymentTermDays' | 'isActive'>>,
  ): Promise<Customer>;
  delete(id: string): Promise<void>;

  /** Add a debt delta to the existing balance. Debt-payment reductions are handled by the DB trigger. */
  updateDebtBalance(id: string, delta: number): Promise<Customer>;

  /** Search customers with pagination. */
  search(filter: CustomerFilter): Promise<PaginatedResult<Customer>>;
}
