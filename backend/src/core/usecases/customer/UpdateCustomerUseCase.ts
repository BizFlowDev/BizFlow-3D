import { Customer } from '../../entities/Customer.js';
import { ICustomerRepository } from '../../repositories/ICustomerRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ConflictError } from '../../errors/ConflictError.js';

export interface UpdateCustomerInput {
  customerId: string;
  storeId: string;
  name?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  note?: string | null;
  isActive?: boolean;
}

export class UpdateCustomerUseCase {
  constructor(private readonly customerRepo: ICustomerRepository) {}

  async execute(input: UpdateCustomerInput): Promise<Customer> {
    // 1. Find existing customer
    const existing = await this.customerRepo.findById(input.customerId);
    if (!existing) {
      throw new NotFoundError('Khách hàng');
    }

    // 2. If phone is changing, check uniqueness
    if (input.phone && input.phone !== existing.phone) {
      const duplicate = await this.customerRepo.findByPhone(input.storeId, input.phone);
      if (duplicate && duplicate.id !== input.customerId) {
        throw new ConflictError(`Số điện thoại "${input.phone}" đã tồn tại trong cửa hàng`);
      }
    }

    // 3. Build update data
    const updateData: {
      name?: string;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      note?: string | null;
      isActive?: boolean;
    } = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.note !== undefined) updateData.note = input.note;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    return this.customerRepo.update(input.customerId, updateData);
  }
}
