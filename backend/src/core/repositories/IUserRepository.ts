import { User } from '../entities/User.js';

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

  /** Update last login timestamp for a user. */
  updateLastLogin(id: string): Promise<void>;
}
