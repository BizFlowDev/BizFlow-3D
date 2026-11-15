import { User } from '../entities/User.js';

export interface EmployeeFilter {
  storeId: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface EmployeeSearchResult {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string, storeId?: string | null): Promise<User | null>;
  findByStoreId(storeId: string): Promise<User[]>;
  create(user: User): Promise<User>;
  update(
    id: string,
    data: Partial<Pick<User, 'fullName' | 'email' | 'phone' | 'role' | 'isActive' | 'passwordHash'>>,
  ): Promise<User>;
  delete(id: string): Promise<void>;

  /** Soft-delete a user (marks deleted_at and sets is_active to false). */
  softDelete(id: string): Promise<void>;

  /** Update active status for all users belonging to a store. */
  updateStatusByStoreId(storeId: string, isActive: boolean): Promise<void>;

  /** Update last login timestamp for a user. */
  updateLastLogin(id: string): Promise<void>;

  /** Total platform users excluding system admins. */
  countNonAdminUsers(): Promise<number>;

  /** Search employees of a store with pagination (role = 'employee'). */
  searchEmployees(filter: EmployeeFilter): Promise<EmployeeSearchResult>;
}
