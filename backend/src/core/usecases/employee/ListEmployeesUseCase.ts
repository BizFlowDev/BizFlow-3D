import { User } from '../../entities/User.js';
import { IUserRepository, EmployeeSearchResult } from '../../repositories/IUserRepository.js';

export interface ListEmployeesInput {
  storeId: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ListEmployeesUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: ListEmployeesInput): Promise<EmployeeSearchResult> {
    return this.userRepo.searchEmployees({
      storeId: input.storeId,
      search: input.search,
      page: input.page ?? 1,
      limit: Math.min(input.limit ?? 10, 100),
    });
  }
}
