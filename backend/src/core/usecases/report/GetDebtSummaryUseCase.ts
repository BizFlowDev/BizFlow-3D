import { IDebtPaymentRepository, DebtSummaryRow } from '../../repositories/IDebtPaymentRepository.js';

export interface DebtSummaryOutput {
  customers: DebtSummaryRow[];
  totalDebt: number;
  totalPaid: number;
  totalRemaining: number;
}

export class GetDebtSummaryUseCase {
  constructor(private readonly debtPaymentRepo: IDebtPaymentRepository) {}

  async execute(storeId: string): Promise<DebtSummaryOutput> {
    const customers = await this.debtPaymentRepo.getDebtSummary(storeId);

    const totalDebt = customers.reduce((sum, c) => sum + c.totalDebtCreated, 0);
    const totalPaid = customers.reduce((sum, c) => sum + c.totalPaid, 0);
    const totalRemaining = customers.reduce((sum, c) => sum + c.remainingDebt, 0);

    return { customers, totalDebt, totalPaid, totalRemaining };
  }
}
