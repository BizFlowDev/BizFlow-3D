import { IOrderRepository, DailyRevenueRow } from '../../repositories/IOrderRepository.js';
import { IDebtPaymentRepository, DebtSummaryRow } from '../../repositories/IDebtPaymentRepository.js';
import { ValidationError } from '../../errors/ValidationError.js';

/**
 * Financial report structure aligned with Thông tư 88/2021/TT-BTC
 * (Simplified for hộ kinh doanh - sole proprietorship).
 */
export interface FinancialReportOutput {
  period: { from: Date; to: Date };
  storeId: string;

  /** I. Doanh thu bán hàng (Revenue) */
  revenue: {
    dailyBreakdown: DailyRevenueRow[];
    totalRevenue: number;
    totalOrders: number;
  };

  /** II. Công nợ phải thu (Receivables) */
  receivables: {
    customers: DebtSummaryRow[];
    totalReceivable: number;
  };

  /** III. Tổng hợp (Summary) */
  summary: {
    grossRevenue: number;
    totalReceivable: number;
    netCashCollected: number;
  };

  generatedAt: Date;
}

export class GenerateFinancialReportUseCase {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly debtPaymentRepo: IDebtPaymentRepository,
  ) {}

  async execute(storeId: string, fromDate: Date, toDate: Date): Promise<FinancialReportOutput> {
    if (fromDate > toDate) {
      throw new ValidationError('Ngày bắt đầu phải trước ngày kết thúc');
    }

    // 1. Get daily revenue data
    const dailyBreakdown = await this.orderRepo.getDailyRevenue(storeId, fromDate, toDate);
    const totalRevenue = dailyBreakdown.reduce((sum, d) => sum + d.totalRevenue, 0);
    const totalOrders = dailyBreakdown.reduce((sum, d) => sum + d.orderCount, 0);

    // 2. Get receivables (customer debts)
    const debtSummary = await this.debtPaymentRepo.getDebtSummary(storeId);
    const totalReceivable = debtSummary.reduce((sum, c) => sum + c.remainingDebt, 0);

    // 3. Build report
    return {
      period: { from: fromDate, to: toDate },
      storeId,
      revenue: {
        dailyBreakdown,
        totalRevenue,
        totalOrders,
      },
      receivables: {
        customers: debtSummary,
        totalReceivable,
      },
      summary: {
        grossRevenue: totalRevenue,
        totalReceivable,
        netCashCollected: totalRevenue - totalReceivable,
      },
      generatedAt: new Date(),
    };
  }
}
