import { Product } from '../../../core/entities/Product.js';
import { ProductUnit } from '../../../core/entities/ProductUnit.js';
import { ProductCategory } from '../../../core/entities/ProductCategory.js';
import { IProductRepository, ProductFilter, PaginatedResult } from '../../../core/repositories/IProductRepository.js';
import { query, transaction } from '../connection.js';
import { mapToCamelCase } from '../mapper.js';

export class PostgresProductRepository implements IProductRepository {
  async findById(id: string): Promise<Product | null> {
    const res = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (res.rowCount === 0) return null;
    const product = Product.fromPersistence(mapToCamelCase(res.rows[0]));
    product.units = await this.findUnitsByProductId(id);
    return product;
  }

  async findByStoreId(storeId: string): Promise<Product[]> {
    const res = await query('SELECT * FROM products WHERE store_id = $1', [storeId]);
    const products = res.rows.map(row => Product.fromPersistence(mapToCamelCase(row)));
    // NOTE: Units are not loaded by default for performance, unless needed.
    return products;
  }

  async findByCode(storeId: string, code: string): Promise<Product | null> {
    const res = await query('SELECT * FROM products WHERE store_id = $1 AND code = $2', [storeId, code]);
    if (res.rowCount === 0) return null;
    const product = Product.fromPersistence(mapToCamelCase(res.rows[0]));
    product.units = await this.findUnitsByProductId(product.id);
    return product;
  }

  async create(product: Product): Promise<Product> {
    return transaction(async (txQuery) => {
      const text = `
        INSERT INTO products (
          id, store_id, category_id, code, name,
          image_url, description, is_active, has_multiple_units,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      const values = [
        product.id,
        product.storeId,
        product.categoryId,
        product.code,
        product.name,
        product.imageUrl,
        product.description,
        product.isActive,
        product.hasMultipleUnits,
        product.createdAt,
        product.updatedAt,
      ];
      const res = await txQuery(text, values);
      const savedProduct = Product.fromPersistence(mapToCamelCase(res.rows[0]));

      if (product.units && product.units.length > 0) {
        for (const unit of product.units) {
          const unitText = `
            INSERT INTO product_units (
              id, product_id, unit_name, conversion_factor, price, is_default, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `;
          await txQuery(unitText, [
            unit.id,
            unit.productId,
            unit.unitName,
            unit.conversionFactor,
            unit.price,
            unit.isDefault,
            unit.createdAt,
          ]);
        }
      }
      
      savedProduct.units = await this.findUnitsByProductId(savedProduct.id);
      return savedProduct;
    });
  }

  async update(
    id: string,
    data: Partial<Pick<Product, 'categoryId' | 'code' | 'name' | 'imageUrl' | 'description' | 'hasMultipleUnits'>>
  ): Promise<Product> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        const dbColumn = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        fields.push(`${dbColumn} = $${idx++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('Product not found');
      return existing;
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date());

    const text = `
      UPDATE products
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;
    values.push(id);

    const res = await query(text, values);
    if (res.rowCount === 0) throw new Error('Product not found');
    const product = Product.fromPersistence(mapToCamelCase(res.rows[0]));
    product.units = await this.findUnitsByProductId(id);
    return product;
  }

  async delete(id: string): Promise<void> {
    await query('DELETE FROM products WHERE id = $1', [id]);
  }

  async toggleStatus(id: string): Promise<Product> {
    const res = await query(
      'UPDATE products SET is_active = NOT is_active, updated_at = $1 WHERE id = $2 RETURNING *',
      [new Date(), id]
    );
    if (res.rowCount === 0) throw new Error('Product not found');
    const product = Product.fromPersistence(mapToCamelCase(res.rows[0]));
    product.units = await this.findUnitsByProductId(id);
    return product;
  }

  async search(filter: ProductFilter): Promise<PaginatedResult<Product>> {
    const conditions: string[] = ['store_id = $1'];
    const params: any[] = [filter.storeId];
    let idx = 2;

    if (filter.categoryId) {
      conditions.push(`category_id = $${idx++}`);
      params.push(filter.categoryId);
    }
    if (filter.isActive !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      params.push(filter.isActive);
    }
    if (filter.search) {
      conditions.push(`(name ILIKE $${idx} OR code ILIKE $${idx})`);
      params.push(`%${filter.search}%`);
      idx++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Count total
    const countRes = await query(`SELECT COUNT(*) FROM products ${whereClause}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const offset = (page - 1) * limit;

    const dataRes = await query(
      `SELECT * FROM products ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    const data = await Promise.all(dataRes.rows.map(async row => {
      const p = Product.fromPersistence(mapToCamelCase(row));
      p.units = await this.findUnitsByProductId(p.id);
      return p;
    }));

    return { data, total, page, limit };
  }

  async countByStoreId(storeId: string): Promise<number> {
    const res = await query('SELECT COUNT(*) FROM products WHERE store_id = $1', [storeId]);
    return parseInt(res.rows[0].count, 10);
  }

  // ── Product Units ──
  async findUnitsByProductId(productId: string): Promise<ProductUnit[]> {
    const res = await query('SELECT * FROM product_units WHERE product_id = $1', [productId]);
    return res.rows.map(row => ProductUnit.fromPersistence(mapToCamelCase(row)));
  }

  async createUnit(unit: ProductUnit): Promise<ProductUnit> {
    const text = `
      INSERT INTO product_units (
        id, product_id, unit_name, conversion_factor, price, is_default, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      unit.id,
      unit.productId,
      unit.unitName,
      unit.conversionFactor,
      unit.price,
      unit.isDefault,
      unit.createdAt,
    ];
    const res = await query(text, values);
    return ProductUnit.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async deleteUnitsByProductId(productId: string): Promise<void> {
    await query('DELETE FROM product_units WHERE product_id = $1', [productId]);
  }

  // ── Product Categories ──
  async findCategoriesByStoreId(storeId: string): Promise<ProductCategory[]> {
    const res = await query('SELECT * FROM product_categories WHERE store_id = $1', [storeId]);
    return res.rows.map(row => ProductCategory.fromPersistence(mapToCamelCase(row)));
  }

  async findCategoryById(id: string): Promise<ProductCategory | null> {
    const res = await query('SELECT * FROM product_categories WHERE id = $1', [id]);
    if (res.rowCount === 0) return null;
    return ProductCategory.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async createCategory(category: ProductCategory): Promise<ProductCategory> {
    const text = `
      INSERT INTO product_categories (
        id, store_id, name, description, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      category.id,
      category.storeId,
      category.name,
      category.description,
      category.isActive,
      category.createdAt,
      category.updatedAt,
    ];
    const res = await query(text, values);
    return ProductCategory.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async updateCategory(id: string, data: Partial<Pick<ProductCategory, 'name' | 'description' | 'isActive'>>): Promise<ProductCategory> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        const dbColumn = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
        fields.push(`${dbColumn} = $${idx++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      const existing = await this.findCategoryById(id);
      if (!existing) throw new Error('Category not found');
      return existing;
    }

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date());

    const text = `
      UPDATE product_categories
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING *
    `;
    values.push(id);

    const res = await query(text, values);
    if (res.rowCount === 0) throw new Error('Category not found');
    return ProductCategory.fromPersistence(mapToCamelCase(res.rows[0]));
  }

  async deleteCategory(id: string): Promise<void> {
    await query('DELETE FROM product_categories WHERE id = $1', [id]);
  }
}
