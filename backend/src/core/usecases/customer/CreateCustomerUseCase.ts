import { z } from 'zod';
import { Customer } from '../../entities/Customer.js';
import { ICustomerRepository } from '../../repositories/ICustomerRepository.js';
import { ConflictError } from '../../errors/ConflictError.js';
import { ValidationError } from '../../errors/ValidationError.js';

const CreateCustomerInputSchema = z.object({
  storeId: z.string().uuid(),
  name: z.string().min(1).max(255),
  phone: z.string().max(20).nullish(),
  email: z.string().email().max(255).nullish(),
  address: z.string().nullish(),
  note: z.string().nullish(),
  creditLimit: z.coerce.number().min(0).default(0).optional(),
  paymentTermDays: z.coerce.number().int().min(1).default(30).optional(),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerInputSchema>;

export class CreateCustomerUseCase {
  constructor(private readonly customerRepo: ICustomerRepository) {}

  async execute(input: CreateCustomerInput): Promise<Customer> {
    // 1. Validate input
    const parsed = CreateCustomerInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu khách hàng không hợp lệ', fields);
    }
    const data = parsed.data;

    // 2. Check phone uniqueness within store (if phone provided)
    if (data.phone) {
      const existing = await this.customerRepo.findByPhone(data.storeId, data.phone);
      if (existing) {
        throw new ConflictError(`Số điện thoại "${data.phone}" đã tồn tại trong cửa hàng`);
      }
    }

    // 3. Create customer
    const customer = Customer.create({
      storeId: data.storeId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      note: data.note,
      creditLimit: data.creditLimit,
      paymentTermDays: data.paymentTermDays,
    });

    return this.customerRepo.create(customer);
  }
}
