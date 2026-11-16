import type { IUnitOfWork } from '../../repositories/IUnitOfWork.js';
import type { IOrderRepository } from '../../repositories/IOrderRepository.js';
import { z } from 'zod';
import { DebtPayment } from '../../entities/DebtPayment.js';
import { IDebtPaymentRepository } from '../../repositories/IDebtPaymentRepository.js';
import { ICustomerRepository } from '../../repositories/ICustomerRepository.js';
import { AutoPostingUseCase } from '../accounting/AutoPostingUseCase.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';

const RecordPaymentInputSchema = z.object({
  storeId: z.string().uuid(),
  customerId: z.string().uuid(),
  orderId: z.string().uuid().nullish(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['cash', 'transfer', 'stripe']),
  note: z.string().nullish(),
  createdBy: z.string().uuid().nullish(),
});

export type RecordDebtPaymentInput = z.infer<typeof RecordPaymentInputSchema>;

export class RecordDebtPaymentUseCase {
  constructor(
    private readonly debtPaymentRepo: IDebtPaymentRepository,
    private readonly customerRepo: ICustomerRepository,
    private readonly autoPosting: AutoPostingUseCase,
    private readonly uow: IUnitOfWork,
    private readonly orderRepo: IOrderRepository,
  ) {}

  async execute(input: RecordDebtPaymentInput): Promise<DebtPayment> {
    // 1. Validate input
    const parsed = RecordPaymentInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu thanh toán không hợp lệ', fields);
    }
    const data = parsed.data;

    return this.uow.run(async () => {
      if (!await this.uow.lock('customer', data.customerId, data.storeId)) throw new NotFoundError('Khách hàng');
      // 2. Verify customer exists
      const customer = await this.customerRepo.findById(data.customerId);
      if (!customer || customer.storeId !== data.storeId) {
        throw new NotFoundError('Khách hàng');
      }

      if (data.orderId) {
        const order = await this.orderRepo.findById(data.orderId);
        if (!order || order.storeId !== data.storeId || order.customerId !== data.customerId || order.status !== 'confirmed') throw new ValidationError('Đơn hàng không thuộc công nợ khách hàng');
      }
      // 3. Validate payment amount doesn't exceed debt
      if (data.amount > customer.debtBalance) {
        throw new ValidationError(
          `Số tiền thanh toán (${data.amount}) vượt quá số nợ hiện tại (${customer.debtBalance})`,
        );
      }

      // 4. Create payment (DB trigger will auto-update customer.debt_balance)
      const payment = DebtPayment.create({
        storeId: data.storeId,
        customerId: data.customerId,
        orderId: data.orderId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        note: data.note,
        createdBy: data.createdBy,
      });

      const created = await this.debtPaymentRepo.create(payment);

      // 6. Hạch toán tự động: giảm phải thu, tăng tiền mặt (Dr 111/112 / Cr 131)
      await this.autoPosting.postDebtPayment(created);

      return created;
    });
  }
}
