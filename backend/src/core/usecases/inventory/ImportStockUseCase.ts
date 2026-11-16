import type { IUnitOfWork } from '../../repositories/IUnitOfWork.js';
import { z } from 'zod';
import { InventoryTransaction } from '../../entities/InventoryTransaction.js';
import { IInventoryRepository } from '../../repositories/IInventoryRepository.js';
import { IProductRepository } from '../../repositories/IProductRepository.js';
import { AutoPostingUseCase } from '../accounting/AutoPostingUseCase.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { ValidationError } from '../../errors/ValidationError.js';

const ImportStockInputSchema = z.object({
  storeId: z.string().uuid(),
  productId: z.string().uuid(),
  productUnitId: z.string().uuid().nullish(),
  quantity: z.number().positive(),
  unitCost: z.number().finite().min(0),
  note: z.string().nullish(),
  createdBy: z.string().uuid().nullish(),
});

export type ImportStockInput = z.infer<typeof ImportStockInputSchema>;

export class ImportStockUseCase {
  constructor(
    private readonly inventoryRepo: IInventoryRepository,
    private readonly productRepo: IProductRepository,
    private readonly autoPosting: AutoPostingUseCase,
    private readonly uow: IUnitOfWork,
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

    return this.uow.run(async () => {
      if (!await this.uow.lock('product', data.productId, data.storeId)) throw new NotFoundError('Sản phẩm');
      // 2. Verify product exists
      const product = await this.productRepo.findById(data.productId);
      if (!product || product.storeId !== data.storeId) {
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

      const created = await this.inventoryRepo.create(transaction);

      // 4. Hạch toán tự động: ghi tăng hàng tồn kho (Dr 156 / Cr 331)
      //    Giá trị nhập = quantity × unitCost do người dùng nhập rõ ràng.
      if (data.productUnitId) {
        const units = await this.productRepo.findUnitsByProductId(data.productId);
        if (!units.some(u => u.id === data.productUnitId)) throw new ValidationError('Đơn vị không thuộc sản phẩm');
      }
      await this.autoPosting.postInventoryImport(created, Math.round(data.quantity * data.unitCost));

      return created;
    });
  }
}
