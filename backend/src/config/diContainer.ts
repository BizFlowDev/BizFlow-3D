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
import { PostgresAuditLogRepository } from '../frameworks/database/repositories/PostgresAuditLogRepository.js';

// Import Redis Token Store
import { RedisRefreshTokenStore } from '../frameworks/redis/RedisRefreshTokenStore.js';

// Import Auth Interfaces
import { IPasswordService } from '../adapters/controllers/AuthController.js';
import { ITokenService, IRefreshTokenStore } from '../core/usecases/auth/LoginUseCase.js';
import { ITokenVerifier } from '../core/usecases/auth/RefreshTokenUseCase.js';
import { IAIService, ParsedOrderItem } from '../core/usecases/ai/ProcessNaturalLanguageOrderUseCase.js';

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

import { GetDailyRevenueUseCase } from '../core/usecases/report/GetDailyRevenueUseCase.js';
import { GetTopProductsUseCase } from '../core/usecases/report/GetTopProductsUseCase.js';
import { GetDebtSummaryUseCase } from '../core/usecases/report/GetDebtSummaryUseCase.js';

import { ProcessNaturalLanguageOrderUseCase } from '../core/usecases/ai/ProcessNaturalLanguageOrderUseCase.js';
import { GenerateDraftOrderUseCase } from '../core/usecases/ai/GenerateDraftOrderUseCase.js';

import { GenerateFinancialReportUseCase } from '../core/usecases/accounting/GenerateFinancialReportUseCase.js';

import { ManageStoreSubscriptionUseCase } from '../core/usecases/admin/ManageStoreSubscriptionUseCase.js';
import { GetSystemAnalyticsUseCase } from '../core/usecases/admin/GetSystemAnalyticsUseCase.js';

// Import Controllers
import { AuthController } from '../adapters/controllers/AuthController.js';
import { ProductController } from '../adapters/controllers/ProductController.js';
import { CustomerController } from '../adapters/controllers/CustomerController.js';
import { OrderController } from '../adapters/controllers/OrderController.js';
import { InventoryController } from '../adapters/controllers/InventoryController.js';
import { DebtController } from '../adapters/controllers/DebtController.js';
import { ReportController } from '../adapters/controllers/ReportController.js';
import { AiOrderController } from '../adapters/controllers/AiOrderController.js';
import { AccountingController } from '../adapters/controllers/AccountingController.js';
import { AdminController } from '../adapters/controllers/AdminController.js';

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

class MockAIService implements IAIService {
  async parseOrderFromText(text: string): Promise<ParsedOrderItem[]> {
    console.log('[MockAIService] Parsing text:', text);
    return [{ productNameOrCode: 'SP-1', quantity: 1 }];
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
const auditLogRepo = new PostgresAuditLogRepository();

// ── Initialize Services ──────────────────────────────────────────────────────
const passwordService = new BcryptPasswordService();
const aiService = new MockAIService();
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
const registerStoreUseCase = new RegisterStoreUseCase(storeRepo, userRepo, passwordService);
const refreshTokenUseCase = new RefreshTokenUseCase(tokenService, tokenService, refreshTokenStore);
const logoutUseCase = new LogoutUseCase(tokenService, refreshTokenStore);

// ── Initialize Other Use Cases ───────────────────────────────────────────────
const createProductUseCase = new CreateProductUseCase(productRepo);
const updateProductUseCase = new UpdateProductUseCase(productRepo);
const listProductsUseCase = new ListProductsUseCase(productRepo);
const listCategoriesUseCase = new ListCategoriesUseCase(productRepo);
const toggleProductStatusUseCase = new ToggleProductStatusUseCase(productRepo);

const createCustomerUseCase = new CreateCustomerUseCase(customerRepo);
const updateCustomerUseCase = new UpdateCustomerUseCase(customerRepo);
const listCustomersUseCase = new ListCustomersUseCase(customerRepo);
const getCustomerDebtUseCase = new GetCustomerDebtUseCase(customerRepo, debtPaymentRepo);

const createOrderUseCase = new CreateOrderUseCase(orderRepo, productRepo, inventoryRepo);
const confirmOrderUseCase = new ConfirmOrderUseCase(orderRepo, inventoryRepo, customerRepo);
const listOrdersUseCase = new ListOrdersUseCase(orderRepo);
const getOrderDetailUseCase = new GetOrderDetailUseCase(orderRepo);

const importStockUseCase = new ImportStockUseCase(inventoryRepo, productRepo);
const getInventoryLevelUseCase = new GetInventoryLevelUseCase(inventoryRepo);

const recordDebtPaymentUseCase = new RecordDebtPaymentUseCase(debtPaymentRepo, customerRepo);

const getDailyRevenueUseCase = new GetDailyRevenueUseCase(orderRepo);
const getTopProductsUseCase = new GetTopProductsUseCase(orderRepo);
const getDebtSummaryUseCase = new GetDebtSummaryUseCase(debtPaymentRepo);

const processNLOrderUseCase = new ProcessNaturalLanguageOrderUseCase(aiService, productRepo);
const generateDraftOrderUseCase = new GenerateDraftOrderUseCase(orderRepo, productRepo);

const generateFinancialReportUseCase = new GenerateFinancialReportUseCase(
  orderRepo,
  debtPaymentRepo,
);

const manageStoreSubscriptionUseCase = new ManageStoreSubscriptionUseCase(storeRepo);
const getSystemAnalyticsUseCase = new GetSystemAnalyticsUseCase(storeRepo, userRepo, orderRepo);

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
  ),
  aiOrderController: new AiOrderController(
    processNLOrderUseCase,
    generateDraftOrderUseCase,
    confirmOrderUseCase,
    orderRepo,
  ),
  accountingController: new AccountingController(generateFinancialReportUseCase),
  adminController: new AdminController(manageStoreSubscriptionUseCase, getSystemAnalyticsUseCase),
  // Also export auditLogRepo to be used by the requestLogger middleware
  auditLogRepo,
};
