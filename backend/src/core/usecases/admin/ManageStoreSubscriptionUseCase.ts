import { z } from 'zod';
import { Store } from '../../entities/Store.js';
import { IStoreRepository } from '../../repositories/IStoreRepository.js';
import { IUserRepository } from '../../repositories/IUserRepository.js';
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
  constructor(
    private readonly storeRepo: IStoreRepository,
    private readonly userRepo?: IUserRepository,
  ) {}

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

    const now = new Date();
    const isExpired =
      store.subscriptionStatus === 'expired' ||
      (store.subscriptionExpiresAt !== null && new Date(store.subscriptionExpiresAt).getTime() < now.getTime());

    // Mốc thời gian bắt đầu tính chu kỳ gói:
    // - Nếu tài khoản đã hết hạn: Tính tiếp nối từ chính ngày hết hạn cũ (store.subscriptionExpiresAt).
    // - Nếu tài khoản còn hạn: Cộng dồn tiếp nối từ ngày hết hạn hiện tại.
    // - Nếu chưa từng có ngày hết hạn: Tính từ thời điểm hiện tại (now).
    let baseDate: Date;
    if (store.subscriptionExpiresAt) {
      baseDate = new Date(store.subscriptionExpiresAt);
    } else {
      baseDate = now;
    }

    const expiresAt = new Date(baseDate);
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

    // Nếu tính từ ngày hết hạn cũ mà thời điểm mới vẫn rơi vào quá khứ (do hết hạn quá lâu trước đó),
    // đảm bảo tài khoản sau khi đóng tiền vẫn có tối thiểu durationMonths kể từ hiện tại để sử dụng
    if (expiresAt.getTime() <= now.getTime()) {
      expiresAt.setTime(now.getTime());
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths);
    }

    const updatedStore = await this.storeRepo.updateSubscription(storeId, {
      subscriptionPlan: plan,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: expiresAt,
    });

    // Nếu trước đó tài khoản của cửa hàng đang bị khóa, thanh toán/gia hạn thành công sẽ tự động mở khóa
    if (this.userRepo) {
      await this.userRepo.updateStatusByStoreId(storeId, true);
    }

    return updatedStore;
  }
}
