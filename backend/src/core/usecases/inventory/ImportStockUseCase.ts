import { z } from 'zod';
import { InventoryTransaction } from '../../entities/InventoryTransaction.js';
import { IInventoryRepository } from '../../repositories/IInventoryRepository.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';

const ImportStockInputSchema = z.object({
  storeId: z.string().uuid(),
  productId: z.string().uuid(),
  productUnitId: z.string().uuid().nullish(),
  quantity: z.number().positive(),
  note: z.string().nullish(),
  createdBy: z.string().uuid().nullish(),
});

export type ImportStockInput = z.infer<typeof ImportStockInputSchema>;

export class ImportStockUseCase {
  constructor(
    private readonly inventoryRepo: IInventoryRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  async execute(input: ImportStockInput): Promise<InventoryTransaction> {
    // 1. Validate input
    const parsed = ImportStockInputSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError('Dữ liệu nhập kho không hợp lệ', fields);
    }
    const data = parsed.data;

    // 2. Verify product exists
    const product = await this.productRepo.findById(data.productId);
    if (!product) {
      throw new NotFoundError('Sản phẩm');
    }

    // 3. Create import transaction
    const transaction = InventoryTransaction.create({
      storeId: data.storeId,
      productId: data.productId,
      productUnitId: data.productUnitId,
      type: 'import',
      quantity: data.quantity,
      referenceType: 'purchase',
      note: data.note,
      createdBy: data.createdBy,
    });

    return this.inventoryRepo.create(transaction);
  }
}
