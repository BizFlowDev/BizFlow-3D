import { Product } from '../entities/Product.js';
import { ProductUnit } from '../entities/ProductUnit.js';
import { ProductCategory } from '../entities/ProductCategory.js';

/** Pagination & filter parameters for product listing. */
export interface ProductFilter {
  storeId: string;
  categoryId?: string;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/** Paginated result type. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface IProductRepository {
  // ── Product CRUD ──
  findById(id: string): Promise<Product | null>;
  findByStoreId(storeId: string): Promise<Product[]>;
  findByCode(storeId: string, code: string): Promise<Product | null>;
  create(product: Product): Promise<Product>;
  update(
    id: string,
    data: Partial<Pick<Product, 'categoryId' | 'code' | 'name' | 'imageUrl' | 'description' | 'hasMultipleUnits'>>,
  ): Promise<Product>;
  delete(id: string): Promise<void>;
  toggleStatus(id: string): Promise<Product>;
  search(filter: ProductFilter): Promise<PaginatedResult<Product>>;
  countByStoreId(storeId: string): Promise<number>;

  // ── Product Units ──
  findUnitsByProductId(productId: string): Promise<ProductUnit[]>;
  createUnit(unit: ProductUnit): Promise<ProductUnit>;
  deleteUnitsByProductId(productId: string): Promise<void>;
  syncUnits(productId: string, units: ProductUnit[]): Promise<ProductUnit[]>;

  // ── Product Categories ──
  findCategoriesByStoreId(storeId: string): Promise<ProductCategory[]>;
  findCategoryById(id: string): Promise<ProductCategory | null>;
  createCategory(category: ProductCategory): Promise<ProductCategory>;
  updateCategory(id: string, data: Partial<Pick<ProductCategory, 'name' | 'description' | 'isActive'>>): Promise<ProductCategory>;
  deleteCategory(id: string): Promise<void>;
}
