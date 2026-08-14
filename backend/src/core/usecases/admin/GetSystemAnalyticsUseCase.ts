import { IStoreRepository } from '../../repositories/IStoreRepository.js';
import { IUserRepository } from '../../repositories/IUserRepository.js';
import { IOrderRepository } from '../../repositories/IOrderRepository.js';
import { ISystemConfigRepository } from '../../repositories/ISystemConfigRepository.js';

export interface PlatformAnalytics {
  totalUsers: number;
  totalStores: number;
  activeSubscriptions: number;
  mrr: number;
  newRegistrations: { date: string; count: number }[];
  revenueOverTime: { date: string; revenue: number }[];
  topStores: {
    id: string;
    name: string;
    revenue: number;
    orders: number;
    plan: string;
  }[];
}

const DEFAULT_PLAN_PRICES = { basic: 199000, professional: 499000 };
const ANALYTICS_MONTHS = 6;
const TOP_STORES_LIMIT = 5;

/**
 * System-level analytics for the admin dashboard.
 * Aggregates real data across all stores/users/orders.
 */
export class GetSystemAnalyticsUseCase {
  constructor(
    private readonly storeRepo: IStoreRepository,
    private readonly userRepo: IUserRepository,
    private readonly orderRepo: IOrderRepository,
    private readonly configRepo: ISystemConfigRepository,
  ) {}

  async execute(): Promise<PlatformAnalytics> {
    const configs = await this.configRepo.findAll();
    const basicPrice = parseInt(
      configs.find((c) => c.key === 'basic_price_monthly')?.value ?? String(DEFAULT_PLAN_PRICES.basic),
      10,
    );
    const professionalPrice = parseInt(
      configs.find((c) => c.key === 'professional_price_monthly')?.value ?? String(DEFAULT_PLAN_PRICES.professional),
      10,
    );

    const [totalUsers, totalStores, activeSubscriptions, mrr, newRegistrations, monthlyRevenue, topStores] =
      await Promise.all([
        this.userRepo.countNonAdminUsers(),
        this.storeRepo.countAll(),
        this.storeRepo.countActiveSubscriptions(),
        this.storeRepo.getMrr(basicPrice, professionalPrice),
        this.storeRepo.getNewRegistrations(ANALYTICS_MONTHS),
        this.orderRepo.getMonthlyRevenue(null, ANALYTICS_MONTHS),
        this.storeRepo.getTopStoresByRevenue(TOP_STORES_LIMIT),
      ]);

    // Fill any missing month buckets so the chart is contiguous.
    const newRegistrationsByDate = new Map(newRegistrations.map((r) => [r.date, r.count]));
    const revenueByMonth = new Map(monthlyRevenue.map((r) => [r.month, r.revenue]));
    const registrations: { date: string; count: number }[] = [];
    const revenueOverTime: { date: string; revenue: number }[] = [];

    for (let i = ANALYTICS_MONTHS - 1; i >= 0; i--) {
      const date = new Date();
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() - i);
      const isoDate = date.toISOString().slice(0, 10); // YYYY-MM-DD
      const monthKey = isoDate.slice(0, 7); // YYYY-MM
      registrations.push({ date: isoDate, count: newRegistrationsByDate.get(isoDate) ?? 0 });
      revenueOverTime.push({ date: isoDate, revenue: revenueByMonth.get(monthKey) ?? 0 });
    }

    return {
      totalUsers,
      totalStores,
      activeSubscriptions,
      mrr,
      newRegistrations: registrations,
      revenueOverTime,
      topStores,
    };
  }
}
