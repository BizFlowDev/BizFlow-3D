import { z } from 'zod';
import { Store } from '../../entities/Store.js';
import { IStoreRepository } from '../../repositories/IStoreRepository.js';
import { IUserRepository } from '../../repositories/IUserRepository.js';
import { IRefreshTokenStore } from '../auth/LoginUseCase.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';

const ToggleStoreStatusInputSchema = z.object({
  storeId: z.string().uuid(),
  activate: z.boolean(),
});

export type ToggleStoreStatusInput = z.infer<typeof ToggleStoreStatusInputSchema>;

/**
 * Admin: activate/deactivate a store and lock/unlock its user accounts.
 */
export class ToggleStoreStatusUseCase {
  constructor(
    private readonly storeRepo: IStoreRepository,
    private readonly userRepo?: IUserRepository,
    private readonly refreshTokenStore?: IRefreshTokenStore,
  ) {}

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

    // 1. Cập nhật trạng thái người dùng (Khóa/Mở khóa tài khoản đăng nhập)
    if (this.userRepo) {
      await this.userRepo.updateStatusByStoreId(storeId, activate);

      // Nếu khóa cửa hàng, thu hồi toàn bộ phiên đăng nhập hiện tại trên Redis
      if (!activate && this.refreshTokenStore) {
        try {
          const users = await this.userRepo.findByStoreId(storeId);
          await Promise.all(users.map((u) => this.refreshTokenStore!.delete(u.id)));
        } catch (err) {
          console.error('[Revoke Store Sessions Error]:', err);
        }
      }
    }

    // 2. KHÔNG thay đổi ngày hết hạn của cửa hàng khi chỉ Khóa/Mở khóa tài khoản!
    // Ngày hết hạn và trạng thái 'active' chỉ được cập nhật khi có giao dịch thanh toán gói thực tế.
    // Kiểm tra xem tại thời điểm này cửa hàng còn hạn hay đã hết hạn:
    const isExpired =
      store.subscriptionStatus === 'expired' ||
      (store.subscriptionExpiresAt !== null && new Date(store.subscriptionExpiresAt).getTime() < Date.now());

    // Nếu cửa hàng đã hết hạn gói, dù Admin có Mở khóa tài khoản để cho phép đăng nhập
    // thì trạng thái gói thuê bao VẪN LÀ 'expired' cho đến khi thanh toán gia hạn thành công.
    const actualSubscriptionStatus = isExpired ? 'expired' : store.subscriptionStatus;

    return this.storeRepo.updateSubscription(storeId, {
      subscriptionPlan: store.subscriptionPlan,
      subscriptionStatus: actualSubscriptionStatus,
      subscriptionExpiresAt: store.subscriptionExpiresAt, // GIỮ NGUYÊN 100%, KHÔNG TỰ ĐỘNG GIA HẠN!
    });
  }
}
