import { z } from 'zod';
import { Store } from '../../entities/Store.js';
import { IStoreRepository } from '../../repositories/IStoreRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';

const ToggleStoreStatusInputSchema = z.object({
  storeId: z.string().uuid(),
  activate: z.boolean(),
});

export type ToggleStoreStatusInput = z.infer<typeof ToggleStoreStatusInputSchema>;

/**
 * Admin: activate/deactivate a store by toggling its subscription status.
 */
export class ToggleStoreStatusUseCase {
  constructor(private readonly storeRepo: IStoreRepository) {}

  async execute(input: ToggleStoreStatusInput): Promise<Store> {
    const parsed = ToggleStoreStatusInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu không hợp lệ', fields);
    }
    const { storeId, activate } = parsed.data;

    const store = await this.storeRepo.findById(storeId);
    if (!store) {
      throw new NotFoundError('Cửa hàng');
    }

    return this.storeRepo.updateSubscription(storeId, {
      subscriptionPlan: store.subscriptionPlan,
      subscriptionStatus: activate ? 'active' : 'expired',
      subscriptionExpiresAt: store.subscriptionExpiresAt,
    });
  }
}
