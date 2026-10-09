import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import env from './index.js';

// Import Repositories
import { PostgresStoreRepository } from '../frameworks/database/repositories/PostgresStoreRepository.js';
import { PostgresUserRepository } from '../frameworks/database/repositories/PostgresUserRepository.js';
import { PostgresProductRepository } from '../frameworks/database/repositories/PostgresProductRepository.js';
import { PostgresCustomerRepository } from '../frameworks/database/repositories/PostgresCustomerRepository.js';
import { PostgresOrderRepository } from '../frameworks/database/repositories/PostgresOrderRepository.js';
import { PostgresInventoryRepository } from '../frameworks/database/repositories/PostgresInventoryRepository.js';
import { PostgresDebtPaymentRepository } from '../frameworks/database/repositories/PostgresDebtPaymentRepository.js';
import { PostgresAccountingRepository } from '../frameworks/database/repositories/PostgresAccountingRepository.js';
import { PostgresAuditLogRepository } from '../frameworks/database/repositories/PostgresAuditLogRepository.js';
import { PostgresSystemConfigRepository } from '../frameworks/database/repositories/PostgresSystemConfigRepository.js';
import { PostgresAnnouncementRepository } from '../frameworks/database/repositories/PostgresAnnouncementRepository.js';
import { PostgresTemplateRepository } from '../frameworks/database/repositories/PostgresTemplateRepository.js';
import { PostgresSubscriptionPlanRepository } from '../frameworks/database/repositories/PostgresSubscriptionPlanRepository.js';
import { PostgresSubscriptionHistoryRepository } from '../frameworks/database/repositories/PostgresSubscriptionHistoryRepository.js';
import { PostgresSubscriptionOrderRepository } from '../frameworks/database/repositories/PostgresSubscriptionOrderRepository.js';
import { StripeGateway } from '../frameworks/payment/StripeGateway.js';
import { CreateStripeUpgradeSessionUseCase } from '../core/usecases/subscription/CreateStripeUpgradeSessionUseCase.js';
import { HandleStripeWebhookUseCase } from '../core/usecases/subscription/HandleStripeWebhookUseCase.js';
import { GetSubscriptionOrderStatusUseCase } from '../core/usecases/subscription/GetSubscriptionOrderStatusUseCase.js';

// Import Redis Token Store
import { RedisRefreshTokenStore } from '../frameworks/redis/RedisRefreshTokenStore.js';

// Import Auth Interfaces
import { IPasswordService } from '../adapters/controllers/AuthController.js';
import { ITokenService, IRefreshTokenStore } from '../core/usecases/auth/LoginUseCase.js';
import { ITokenVerifier } from '../core/usecases/auth/RefreshTokenUseCase.js';

// Import Auth Use Cases
import { LoginUseCase } from '../core/usecases/auth/LoginUseCase.js';
import { RegisterStoreUseCase } from '../core/usecases/auth/RegisterStoreUseCase.js';
import { RefreshTokenUseCase } from '../core/usecases/auth/RefreshTokenUseCase.js';
import { LogoutUseCase } from '../core/usecases/auth/LogoutUseCase.js';

// Import Other Use Cases
import { CreateProductUseCase } from '../core/usecases/product/CreateProductUseCase.js';
import { UpdateProductUseCase } from '../core/usecases/product/UpdateProductUseCase.js';
import { ListProductsUseCase } from '../core/usecases/product/ListProductsUseCase.js';
import { ListCategoriesUseCase } from '../core/usecases/product/ListCategoriesUseCase.js';
import { CreateCategoryUseCase } from '../core/usecases/product/CreateCategoryUseCase.js';
import { UpdateCategoryUseCase } from '../core/usecases/product/UpdateCategoryUseCase.js';
import { DeleteCategoryUseCase } from '../core/usecases/product/DeleteCategoryUseCase.js';
import { DeleteProductUseCase } from '../core/usecases/product/DeleteProductUseCase.js';
import { ToggleProductStatusUseCase } from '../core/usecases/product/ToggleProductStatusUseCase.js';

import { CreateCustomerUseCase } from '../core/usecases/customer/CreateCustomerUseCase.js';
import { UpdateCustomerUseCase } from '../core/usecases/customer/UpdateCustomerUseCase.js';
import { ListCustomersUseCase } from '../core/usecases/customer/ListCustomersUseCase.js';
import { GetCustomerDebtUseCase } from '../core/usecases/customer/GetCustomerDebtUseCase.js';

import { CreateOrderUseCase } from '../core/usecases/order/CreateOrderUseCase.js';
import { ListOrdersUseCase } from '../core/usecases/order/ListOrdersUseCase.js';
import { GetOrderDetailUseCase } from '../core/usecases/order/GetOrderDetailUseCase.js';
import { ConfirmOrderUseCase } from '../core/usecases/order/ConfirmOrderUseCase.js';

import { ImportStockUseCase } from '../core/usecases/inventory/ImportStockUseCase.js';
import { GetInventoryLevelUseCase } from '../core/usecases/inventory/GetInventoryLevelUseCase.js';

import { RecordDebtPaymentUseCase } from '../core/usecases/debt/RecordDebtPaymentUseCase.js';

import { AutoPostingUseCase } from '../core/usecases/accounting/AutoPostingUseCase.js';
import { GenerateFinancialReportUseCase } from '../core/usecases/accounting/GenerateFinancialReportUseCase.js';

import { GetDailyRevenueUseCase } from '../core/usecases/report/GetDailyRevenueUseCase.js';
import { GetTopProductsUseCase } from '../core/usecases/report/GetTopProductsUseCase.js';
import { GetDebtSummaryUseCase } from '../core/usecases/report/GetDebtSummaryUseCase.js';
import { GetRevenueByCategoryUseCase } from '../core/usecases/report/GetRevenueByCategoryUseCase.js';

import { ManageStoreSubscriptionUseCase } from '../core/usecases/admin/ManageStoreSubscriptionUseCase.js';
import { ToggleStoreStatusUseCase } from '../core/usecases/admin/ToggleStoreStatusUseCase.js';
import { GetSystemAnalyticsUseCase } from '../core/usecases/admin/GetSystemAnalyticsUseCase.js';
import { ListStoresUseCase } from '../core/usecases/admin/ListStoresUseCase.js';
import { GetStoreDetailUseCase } from '../core/usecases/admin/GetStoreDetailUseCase.js';
import { CreateStoreUseCase } from '../core/usecases/admin/CreateStoreUseCase.js';

import { ListEmployeesUseCase } from '../core/usecases/employee/ListEmployeesUseCase.js';
import { CreateEmployeeUseCase } from '../core/usecases/employee/CreateEmployeeUseCase.js';
import { ToggleEmployeeStatusUseCase } from '../core/usecases/employee/ToggleEmployeeStatusUseCase.js';
import { ResetEmployeePasswordUseCase } from '../core/usecases/employee/ResetEmployeePasswordUseCase.js';
import { SoftDeleteEmployeeUseCase } from '../core/usecases/employee/SoftDeleteEmployeeUseCase.js';

// Import Controllers
import { AuthController } from '../adapters/controllers/AuthController.js';
import { ProductController } from '../adapters/controllers/ProductController.js';
import { CustomerController } from '../adapters/controllers/CustomerController.js';
import { OrderController } from '../adapters/controllers/OrderController.js';
import { InventoryController } from '../adapters/controllers/InventoryController.js';
import { DebtController } from '../adapters/controllers/DebtController.js';
import { ReportController } from '../adapters/controllers/ReportController.js';
import { AccountingController } from '../adapters/controllers/AccountingController.js';
import { AdminController } from '../adapters/controllers/AdminController.js';
import { EmployeeController } from '../adapters/controllers/EmployeeController.js';

// ── Service Implementations ──────────────────────────────────────────────────

class BcryptPasswordService implements IPasswordService {
  async hash(plain: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plain, salt);
  }
  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}


/**
 * JWT token service.
 * Implements both ITokenService (generate) and ITokenVerifier (verify).
 *
 * - Access token:  signed with JWT_SECRET,         expires in JWT_ACCESS_EXPIRES_IN (15m)
 * - Refresh token: signed with JWT_REFRESH_SECRET, expires in JWT_REFRESH_EXPIRES_IN (7d)
 */
class JwtTokenService implements ITokenService, ITokenVerifier {
  generateAccessToken(payload: { userId: string; storeId: string | null; role: string }): string {
    return jwt.sign(
      { userId: payload.userId, storeId: payload.storeId, role: payload.role },
      env.JWT_SECRET as string,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as string } as jwt.SignOptions,
    );
  }

  generateRefreshToken(payload: { userId: string; storeId: string | null; role: string }): string {
    return jwt.sign(
      { userId: payload.userId, storeId: payload.storeId, role: payload.role },
      env.JWT_REFRESH_SECRET as string,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as string } as jwt.SignOptions,
    );
  }

  verifyRefreshToken(token: string): { userId: string; storeId: string | null; role: string } {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET as string) as {
      userId: string;
      storeId: string | null;
      role: string;
    };
    return {
      userId: decoded.userId,
      storeId: decoded.storeId ?? null,
      role: decoded.role,
    };
  }
}

// ── Initialize Repositories ──────────────────────────────────────────────────
const storeRepo = new PostgresStoreRepository();
const userRepo = new PostgresUserRepository();
const productRepo = new PostgresProductRepository();
const customerRepo = new PostgresCustomerRepository();
const orderRepo = new PostgresOrderRepository();
const inventoryRepo = new PostgresInventoryRepository();
const debtPaymentRepo = new PostgresDebtPaymentRepository();
const accountingRepo = new PostgresAccountingRepository();
const auditLogRepo = new PostgresAuditLogRepository();
const systemConfigRepo = new PostgresSystemConfigRepository();
const announcementRepo = new PostgresAnnouncementRepository();
const templateRepo = new PostgresTemplateRepository();
const subscriptionPlanRepo = new PostgresSubscriptionPlanRepository();
const subscriptionHistoryRepo = new PostgresSubscriptionHistoryRepository();
const subscriptionOrderRepo = new PostgresSubscriptionOrderRepository();
const stripeGateway = new StripeGateway();

// ── Initialize Services ──────────────────────────────────────────────────────
const passwordService = new BcryptPasswordService();
const tokenService = new JwtTokenService();

// Redis-backed refresh token store
const refreshTokenStore = new RedisRefreshTokenStore();

// ── Initialize Auth Use Cases ────────────────────────────────────────────────
const loginUseCase = new LoginUseCase(
  userRepo,
  storeRepo,
  passwordService,
  tokenService,
  refreshTokenStore,
);
const registerStoreUseCase = new RegisterStoreUseCase(
  storeRepo,
  userRepo,
  passwordService,
  tokenService,
  refreshTokenStore,
);
const refreshTokenUseCase = new RefreshTokenUseCase(tokenService, tokenService, refreshTokenStore);
const logoutUseCase = new LogoutUseCase(tokenService, refreshTokenStore);

// ── Initialize Other Use Cases ───────────────────────────────────────────────
const createProductUseCase = new CreateProductUseCase(productRepo);
const updateProductUseCase = new UpdateProductUseCase(productRepo);
const listProductsUseCase = new ListProductsUseCase(productRepo);
const listCategoriesUseCase = new ListCategoriesUseCase(productRepo);
const createCategoryUseCase = new CreateCategoryUseCase(productRepo);
const updateCategoryUseCase = new UpdateCategoryUseCase(productRepo);
const deleteCategoryUseCase = new DeleteCategoryUseCase(productRepo);
const toggleProductStatusUseCase = new ToggleProductStatusUseCase(productRepo);
const deleteProductUseCase = new DeleteProductUseCase(productRepo);

const createCustomerUseCase = new CreateCustomerUseCase(customerRepo);
const updateCustomerUseCase = new UpdateCustomerUseCase(customerRepo);
const listCustomersUseCase = new ListCustomersUseCase(customerRepo);
const getCustomerDebtUseCase = new GetCustomerDebtUseCase(customerRepo, debtPaymentRepo, orderRepo);

const createOrderUseCase = new CreateOrderUseCase(orderRepo, productRepo, inventoryRepo, customerRepo);
const autoPostingUseCase = new AutoPostingUseCase(accountingRepo);
const confirmOrderUseCase = new ConfirmOrderUseCase(orderRepo, inventoryRepo, customerRepo, autoPostingUseCase, productRepo);
const listOrdersUseCase = new ListOrdersUseCase(orderRepo);
const getOrderDetailUseCase = new GetOrderDetailUseCase(orderRepo);

const importStockUseCase = new ImportStockUseCase(inventoryRepo, productRepo, autoPostingUseCase);
const getInventoryLevelUseCase = new GetInventoryLevelUseCase(inventoryRepo);

const recordDebtPaymentUseCase = new RecordDebtPaymentUseCase(debtPaymentRepo, customerRepo, autoPostingUseCase);

const getDailyRevenueUseCase = new GetDailyRevenueUseCase(orderRepo);
const getTopProductsUseCase = new GetTopProductsUseCase(orderRepo);
const getDebtSummaryUseCase = new GetDebtSummaryUseCase(debtPaymentRepo);
const getRevenueByCategoryUseCase = new GetRevenueByCategoryUseCase(orderRepo);

const generateFinancialReportUseCase = new GenerateFinancialReportUseCase(
  orderRepo,
  accountingRepo,
);

const manageStoreSubscriptionUseCase = new ManageStoreSubscriptionUseCase(storeRepo);
const toggleStoreStatusUseCase = new ToggleStoreStatusUseCase(storeRepo);
const listStoresUseCase = new ListStoresUseCase(storeRepo);
const getStoreDetailUseCase = new GetStoreDetailUseCase(storeRepo, orderRepo);
const createStoreUseCase = new CreateStoreUseCase(storeRepo, userRepo, passwordService);
const getSystemAnalyticsUseCase = new GetSystemAnalyticsUseCase(
  storeRepo,
  userRepo,
  orderRepo,
  systemConfigRepo,
);

const listEmployeesUseCase = new ListEmployeesUseCase(userRepo);
const createEmployeeUseCase = new CreateEmployeeUseCase(
  userRepo,
  passwordService,
  storeRepo,
  subscriptionPlanRepo,
);
const toggleEmployeeStatusUseCase = new ToggleEmployeeStatusUseCase(userRepo);
const resetEmployeePasswordUseCase = new ResetEmployeePasswordUseCase(userRepo, passwordService);
const softDeleteEmployeeUseCase = new SoftDeleteEmployeeUseCase(userRepo);

const createStripeUpgradeSessionUseCase = new CreateStripeUpgradeSessionUseCase(
  storeRepo,
  subscriptionPlanRepo,
  subscriptionOrderRepo,
  stripeGateway,
);
const handleStripeWebhookUseCase = new HandleStripeWebhookUseCase(
  stripeGateway,
  storeRepo,
  subscriptionOrderRepo,
  subscriptionHistoryRepo,
  manageStoreSubscriptionUseCase,
);
const getSubscriptionOrderStatusUseCase = new GetSubscriptionOrderStatusUseCase(
  subscriptionOrderRepo,
  stripeGateway,
  handleStripeWebhookUseCase,
);

// ── Initialize Controllers ───────────────────────────────────────────────────
export const controllers = {
  authController: new AuthController(
    loginUseCase,
    registerStoreUseCase,
    refreshTokenUseCase,
    logoutUseCase,
    userRepo,
    passwordService,
  ),
  productController: new ProductController(
    createProductUseCase,
    updateProductUseCase,
    listProductsUseCase,
    toggleProductStatusUseCase,
    listCategoriesUseCase,
    createCategoryUseCase,
    updateCategoryUseCase,
    deleteCategoryUseCase,
    deleteProductUseCase,
  ),
  customerController: new CustomerController(
    createCustomerUseCase,
    updateCustomerUseCase,
    listCustomersUseCase,
    getCustomerDebtUseCase,
    customerRepo,
  ),
  orderController: new OrderController(
    createOrderUseCase,
    listOrdersUseCase,
    getOrderDetailUseCase,
    confirmOrderUseCase,
    orderRepo,
  ),
  inventoryController: new InventoryController(
    importStockUseCase,
    getInventoryLevelUseCase,
    inventoryRepo,
  ),
  debtController: new DebtController(recordDebtPaymentUseCase, getDebtSummaryUseCase),
  reportController: new ReportController(
    getDailyRevenueUseCase,
    getTopProductsUseCase,
    getDebtSummaryUseCase,
    getRevenueByCategoryUseCase,
  ),
  accountingController: new AccountingController(generateFinancialReportUseCase),
  employeeController: new EmployeeController(
    listEmployeesUseCase,
    createEmployeeUseCase,
    toggleEmployeeStatusUseCase,
    resetEmployeePasswordUseCase,
    softDeleteEmployeeUseCase,
    userRepo,
    auditLogRepo,
  ),
  adminController: new AdminController(
    manageStoreSubscriptionUseCase,
    toggleStoreStatusUseCase,
    getSystemAnalyticsUseCase,
    listStoresUseCase,
    getStoreDetailUseCase,
    createStoreUseCase,
    systemConfigRepo,
    announcementRepo,
    templateRepo,
    subscriptionPlanRepo,
    subscriptionHistoryRepo,
    subscriptionOrderRepo,
    stripeGateway,
    handleStripeWebhookUseCase,
  ),
  // Also export auditLogRepo to be used by the requestLogger middleware
  auditLogRepo,
  // Also export storeRepo to be used by storeRoutes
  storeRepo,
  subscriptionPlanRepo,
  subscriptionHistoryRepo,
  manageStoreSubscriptionUseCase,
  systemConfigRepo,
  subscriptionOrderRepo,
  stripeGateway,
  createStripeUpgradeSessionUseCase,
  handleStripeWebhookUseCase,
  getSubscriptionOrderStatusUseCase,
};
