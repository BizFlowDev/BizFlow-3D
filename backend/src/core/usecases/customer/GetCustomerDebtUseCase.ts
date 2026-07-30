import { ICustomerRepository } from '../../repositories/ICustomerRepository.js';
import { IDebtPaymentRepository, DebtSummaryRow } from '../../repositories/IDebtPaymentRepository.js';
import { DebtPayment } from '../../entities/DebtPayment.js';
import { NotFoundError } from '../../errors/NotFoundError.js';

export interface CustomerDebtOutput {
  summary: DebtSummaryRow;
  payments: DebtPayment[];
}

export class GetCustomerDebtUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly debtPaymentRepo: IDebtPaymentRepository,
  ) {}

  async execute(customerId: string): Promise<CustomerDebtOutput> {
    // 1. Verify customer exists
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      throw new NotFoundError('Khách hàng');
    }

    // 2. Get debt summary
    const summary = await this.debtPaymentRepo.getCustomerDebtSummary(customerId);
    if (!summary) {
      // Customer exists but no debt data — return zero summary
      return {
        summary: {
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          currentDebt: customer.debtBalance,
          totalPaid: 0,
          totalDebtCreated: 0,
          remainingDebt: customer.debtBalance,
        },
        payments: [],
      };
    }

    // 3. Get payment history
    const payments = await this.debtPaymentRepo.findByCustomerId(customerId);

    return { summary, payments };
  }
}
