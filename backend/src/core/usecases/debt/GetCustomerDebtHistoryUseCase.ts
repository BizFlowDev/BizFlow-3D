import { DebtPayment } from '../../entities/DebtPayment.js';
import { IDebtPaymentRepository } from '../../repositories/IDebtPaymentRepository.js';
import { ICustomerRepository } from '../../repositories/ICustomerRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';

export class GetCustomerDebtHistoryUseCase {
  constructor(
    private readonly debtPaymentRepo: IDebtPaymentRepository,
    private readonly customerRepo: ICustomerRepository,
  ) {}

  async execute(customerId: string): Promise<DebtPayment[]> {
    // 1. Verify customer exists
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      throw new NotFoundError('Khách hàng');
    }

    // 2. Get payment history
    return this.debtPaymentRepo.findByCustomerId(customerId);
  }
}
