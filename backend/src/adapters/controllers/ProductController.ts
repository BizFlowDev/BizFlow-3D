import type { Request, Response, NextFunction } from 'express';
import { CreateProductUseCase } from '../../core/usecases/product/CreateProductUseCase.js';
import { UpdateProductUseCase } from '../../core/usecases/product/UpdateProductUseCase.js';
import { ListProductsUseCase } from '../../core/usecases/product/ListProductsUseCase.js';
import { ListCategoriesUseCase } from '../../core/usecases/product/ListCategoriesUseCase.js';
import { CreateCategoryUseCase } from '../../core/usecases/product/CreateCategoryUseCase.js';
import { UpdateCategoryUseCase } from '../../core/usecases/product/UpdateCategoryUseCase.js';
import { DeleteCategoryUseCase } from '../../core/usecases/product/DeleteCategoryUseCase.js';
import { DeleteProductUseCase } from '../../core/usecases/product/DeleteProductUseCase.js';
import { ToggleProductStatusUseCase } from '../../core/usecases/product/ToggleProductStatusUseCase.js';
import { ApiResponse } from '../presenters/ApiResponse.js';
import { AuthenticationError } from '../../core/errors/AuthenticationError.js';

/**
 * Product controller.
 * Handles CRUD operations for products and categories within a store.
 */
export class ProductController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly toggleProductStatusUseCase: ToggleProductStatusUseCase,
    private readonly listCategoriesUseCase: ListCategoriesUseCase,
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
  ) {}

  /**
   * POST /api/products
   * Body: { code, name, categoryId?, units[], ... }
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.createProductUseCase.execute({
        storeId,
        ...req.body,
      });

      const response = ApiResponse.created(result, 'Tạo sản phẩm thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/products/:id
   * Body: { code?, name?, categoryId?, imageUrl?, description? }
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.updateProductUseCase.execute({
        productId: req.params.id as string,
        storeId,
        ...req.body,
      });

      const response = ApiResponse.success(result, 'Cập nhật sản phẩm thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
   };

  /**
   * DELETE /api/products/:id
   * Xóa sản phẩm vĩnh viễn (bao gồm cả ảnh trên Cloudinary).
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      await this.deleteProductUseCase.execute({
        productId: req.params.id as string,
        storeId,
      });

      const response = ApiResponse.success(null, 'Xoá sản phẩm thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/products
   * Query: { categoryId?, isActive?, search?, page?, limit? }
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.listProductsUseCase.execute({
        storeId,
        categoryId: req.query.categoryId as string | undefined,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        search: req.query.search as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      const response = ApiResponse.paginated(result, 'Lấy danh sách sản phẩm thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/products/:id/toggle-status
   * Toggles product isActive status.
   */
  toggleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.toggleProductStatusUseCase.execute(req.params.id as string);

      const response = ApiResponse.success(result, 'Cập nhật trạng thái sản phẩm thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/products/categories
   * List active product categories for the current store.
   */
  listCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.listCategoriesUseCase.execute(storeId);

      const response = ApiResponse.success(result, 'Lấy danh sách danh mục thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/products/categories
   * Create a new category for the current store.
   */
  createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.createCategoryUseCase.execute({
        storeId,
        ...req.body,
      });

      const response = ApiResponse.created(result, 'Tạo danh mục thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/products/categories/:id
   * Update category for the current store.
   */
  updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.updateCategoryUseCase.execute({
        id: req.params.id as string,
        storeId,
        ...req.body,
      });

      const response = ApiResponse.success(result, 'Cập nhật danh mục thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/products/categories/:id
   * Delete category from the current store.
   */
  deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      await this.deleteCategoryUseCase.execute({
        id: req.params.id as string,
        storeId,
      });

      const response = ApiResponse.success(null, 'Xoá danh mục thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/products/category/:categoryId
   * List products filtered by category.
   */
  getByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) throw new AuthenticationError('Store không xác định');

      const result = await this.listProductsUseCase.execute({
        storeId,
        categoryId: req.params.categoryId as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });

      const response = ApiResponse.paginated(result, 'Lấy sản phẩm theo danh mục thành công');
      res.status(response.statusCode).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  };
}
