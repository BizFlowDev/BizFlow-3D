import { ICustomerRepository } from '../../repositories/ICustomerRepository.js';
import { IDebtPaymentRepository, DebtSummaryRow } from '../../repositories/IDebtPaymentRepository.js';
import { IOrderRepository } from '../../repositories/IOrderRepository.js';
import { DebtPayment } from '../../entities/DebtPayment.js';
import { NotFoundError } from '../../errors/NotFoundError.js';

export interface CustomerDebtOutput {
  summary: DebtSummaryRow;
  payments: DebtPayment[];
  debtOrders: {
    id: string;
    orderCode: string;
    debtAmount: number;
    finalAmount: number;
    createdAt: Date;
    note?: string;
  }[];
}

export class GetCustomerDebtUseCase {
  constructor(
    private readonly customerRepo: ICustomerRepository,
    private readonly debtPaymentRepo: IDebtPaymentRepository,
    private readonly orderRepo?: IOrderRepository,
  ) {}

  async execute(customerId: string): Promise<CustomerDebtOutput> {
    // 1. Verify customer exists
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      throw new NotFoundError('Khách hàng');
    }

    // 2. Get debt orders
    let debtOrders: {
      id: string;
      orderCode: string;
      debtAmount: number;
      finalAmount: number;
      createdAt: Date;
      note?: string;
    }[] = [];

    if (this.orderRepo) {
      const orders = await this.orderRepo.findByCustomerId(customerId);
      debtOrders = orders
        .filter((o) => o.debtAmount > 0 && o.status !== 'cancelled')
        .map((o) => ({
          id: o.id,
          orderCode: `DH-${o.id.slice(0, 8).toUpperCase()}`,
          debtAmount: o.debtAmount,
          finalAmount: o.finalAmount,
          createdAt: o.createdAt,
          note: o.note || undefined,
        }));
    }

    // 3. Get debt summary
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
        debtOrders,
      };
    }

    // 4. Get payment history
    const payments = await this.debtPaymentRepo.findByCustomerId(customerId);

    return { summary, payments, debtOrders };
  }
}
