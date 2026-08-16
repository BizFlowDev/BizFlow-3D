import { z } from 'zod';
import { Store } from '../../entities/Store.js';
import { IStoreRepository } from '../../repositories/IStoreRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';

const ManageSubscriptionInputSchema = z.object({
  storeId: z.string().uuid(),
  plan: z.string().min(1).max(50),
  price: z.number().min(0).optional(),
  durationMonths: z.number().int().min(1).max(120),
});

export type ManageSubscriptionInput = z.infer<typeof ManageSubscriptionInputSchema>;

/**
 * Admin: change a store's subscription plan.
 * Computes the new expiry date from the requested duration.
 */
export class ManageStoreSubscriptionUseCase {
  constructor(private readonly storeRepo: IStoreRepository) {}

  async execute(input: ManageSubscriptionInput): Promise<Store> {
    const parsed = ManageSubscriptionInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu gói dịch vụ không hợp lệ', fields);
    }
    const { storeId, plan, durationMonths } = parsed.data;

    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new NotFoundError('Cửa hàng');
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    return this.storeRepo.updateSubscription(storeId, {
      subscriptionPlan: plan,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: expiresAt,
    });
  }
}
