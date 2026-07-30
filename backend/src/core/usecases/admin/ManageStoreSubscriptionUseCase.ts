import { z } from 'zod';
import { Store } from '../../entities/Store.js';
import { IStoreRepository } from '../../repositories/IStoreRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';

const ManageSubscriptionInputSchema = z.object({
  storeId: z.string().uuid(),
  subscriptionPlan: z.enum(['basic', 'professional']),
  subscriptionStatus: z.enum(['active', 'expired', 'trial']),
  subscriptionExpiresAt: z.coerce.date().nullish(),
});

export type ManageSubscriptionInput = z.infer<typeof ManageSubscriptionInputSchema>;

export class ManageStoreSubscriptionUseCase {
  constructor(private readonly storeRepo: IStoreRepository) {}

  async execute(input: ManageSubscriptionInput): Promise<Store> {
    // 1. Validate input
    const parsed = ManageSubscriptionInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu gói dịch vụ không hợp lệ', fields);
    }
    const data = parsed.data;

    // 2. Verify store exists
    const store = await this.storeRepo.findById(data.storeId);
    if (!store) {
      throw new NotFoundError('Cửa hàng');
    }

    // 3. Update subscription
    return this.storeRepo.updateSubscription(data.storeId, {
      subscriptionPlan: data.subscriptionPlan,
      subscriptionStatus: data.subscriptionStatus,
      subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
    });
  }
}
