import { Order } from '../../entities/Order.js';
import { OrderItem } from '../../entities/OrderItem.js';
import { InventoryTransaction } from '../../entities/InventoryTransaction.js';
import { DebtPayment } from '../../entities/DebtPayment.js';
import { AccountingEntry } from '../../entities/AccountingEntry.js';
import { IAccountingRepository } from '../../repositories/IAccountingRepository.js';

/**
 * AutoPostingUseCase
 *
 * Tự động tạo các bút toán (accounting_entries) khi có giao dịch nghiệp vụ.
 * Mỗi nghiệp vụ tạo 1 nhóm bút toán được cân đối (tổng Nợ = tổng Có),
 * gắn reference_type + reference_id để tránh hạch toán trùng (idempotent).
 *
 * Danh mục tài khoản theo Thông tư 88/2021/TT-BTC (rút gọn cho hộ kinh doanh):
 *   111 Tiền mặt · 131 Phải thu khách hàng · 156 Hàng hóa · 331 Phải trả người bán
 *   511 Doanh thu bán hàng · 632 Giá vốn hàng bán
 */
export class AutoPostingUseCase {
  constructor(private readonly accountingRepo: IAccountingRepository) {}

  // ── Helper ───────────────────────────────────────────────────────────────
  private entry(props: {
    storeId: string;
    entryDate: Date;
    accountCode: string;
    accountName: string;
    debit?: number;
    credit?: number;
    referenceType: 'order' | 'inventory_import' | 'debt_payment';
    referenceId: string;
    description: string;
  }): AccountingEntry {
    return AccountingEntry.create({
      storeId: props.storeId,
      entryDate: props.entryDate,
      accountCode: props.accountCode,
      accountName: props.accountName,
      debitAmount: props.debit ?? 0,
      creditAmount: props.credit ?? 0,
      referenceType: props.referenceType,
      referenceId: props.referenceId,
      description: props.description,
    });
  }

  /** Từ chối hạch toán trùng trên cùng reference. */
  private async isAlreadyPosted(
    type: 'order' | 'inventory_import' | 'debt_payment',
    referenceId: string,
  ): Promise<boolean> {
    const existing = await this.accountingRepo.findByReference(type, referenceId);
    return existing.length > 0;
  }

  // ── 1. Order confirmed ───────────────────────────────────────────────────
  /**
   * Ghi nhận doanh thu + giá vốn khi đơn confirmed.
   * - Nếu khách trả tiền mặt ngay: Dr 111 Tiền mặt / Cr 511 Doanh thu
   * - Nếu ghi nợ: Dr 131 .../ hoặc toàn bộ nợ → Dr 131 Phải thu khách hàng
   * - Giá vốn: Dr 632 Giá vốn hàng bán / Cr 156 Hàng hóa
   */
  async postOrderConfirmed(order: Order, items: OrderItem[]): Promise<void> {
    if (await this.isAlreadyPosted('order', order.id)) return;

    const entryDate = order.confirmedAt ?? order.updatedAt;
    const cashAmount = order.finalAmount - order.debtAmount;

    // 1a) Doanh thu (khống nhất theo T88: doanh thu chưa thuế).
    if (cashAmount > 0) {
      // Chọn tài khoản theo phương thức thanh toán
      const isElectronic = order.paymentMethod === 'stripe' || order.paymentMethod === 'qr_code';
      const cashAccountCode = isElectronic ? '112' : '111';
      const cashAccountName = isElectronic ? 'Tiền gửi ngân hàng / Cổng thanh toán' : 'Tiền mặt';
      const cashDescription = order.paymentMethod === 'stripe'
        ? 'Doanh thu bán hàng thu qua cổng thanh toán Stripe'
        : order.paymentMethod === 'qr_code'
        ? 'Doanh thu bán hàng thu bằng chuyển khoản QR'
        : 'Doanh thu bán hàng thu bằng tiền mặt';

      await this.accountingRepo.createMany([
        this.entry({
          storeId: order.storeId, entryDate,
          accountCode: cashAccountCode, accountName: cashAccountName,
          debit: cashAmount, referenceType: 'order', referenceId: order.id,
          description: cashDescription,
        }),
      ]);
    }
    if (order.debtAmount > 0) {
      await this.accountingRepo.createMany([
        this.entry({
          storeId: order.storeId, entryDate,
          accountCode: '131', accountName: 'Phải thu của khách hàng',
          debit: order.debtAmount, referenceType: 'order', referenceId: order.id,
          description: 'Phải thu khách hàng (bán chịu)',
        }),
      ]);
    }
    // Cr. Doanh thu bán hàng
    await this.accountingRepo.createMany([
      this.entry({
        storeId: order.storeId, entryDate,
        accountCode: '511', accountName: 'Doanh thu bán hàng và cung cấp dịch vụ',
        credit: order.finalAmount, referenceType: 'order', referenceId: order.id,
        description: 'Ghi nhận doanh thu bán hàng',
      }),
    ]);

    // 1b) Ghi nhận giá vốn theo phương pháp Bình quân gia quyền (Weighted Average Cost)
    const productIds = [...new Set(items.map((it) => it.productId))];
    const unitIds = items
      .map((it) => it.productUnitId)
      .filter((id): id is string => Boolean(id));

    const avgCostMap = await this.accountingRepo.getProductAverageCosts(order.storeId, productIds);
    const unitFactors = await this.accountingRepo.getUnitConversionFactors(unitIds);

    let goodsValue = 0;
    for (const item of items) {
      const conversionFactor = item.productUnitId ? (unitFactors.get(item.productUnitId) ?? 1) : 1;
      const baseQty = item.quantity * conversionFactor;
      const avgUnitCost = avgCostMap.get(item.productId);

      if (avgUnitCost !== undefined && avgUnitCost > 0) {
        goodsValue += Math.round(baseQty * avgUnitCost);
      } else {
        // Fallback: nếu chưa từng có chứng từ nhập kho, tạm tính theo giá bán
        goodsValue += item.totalPrice;
      }
    }

    if (goodsValue > 0) {
      await this.accountingRepo.createMany([
        this.entry({
          storeId: order.storeId, entryDate,
          accountCode: '632', accountName: 'Giá vốn hàng bán',
          debit: goodsValue, referenceType: 'order', referenceId: order.id,
          description: 'Giá vốn hàng bán',
        }),
        this.entry({
          storeId: order.storeId, entryDate,
          accountCode: '156', accountName: 'Hàng hóa',
          credit: goodsValue, referenceType: 'order', referenceId: order.id,
          description: 'Xuất kho hàng hóa',
        }),
      ]);
    }
  }

  // ── 2. Inventory import ──────────────────────────────────────────────────
  /**
   * Ghi nhận tăng hàng tồn kho khi nhập kho.
   * Dr. 156 Hàng c                       / Cr. 331 Phải trả người bán (mua chịu)
   * Giá trị nhập = quantity × unit cost do caller truyền vào (value).
   */
  async postInventoryImport(txn: InventoryTransaction, value: number): Promise<void> {
    if (await this.isAlreadyPosted('inventory_import', txn.id)) return;
    if (value <= 0) return;

    await this.accountingRepo.createMany([
      this.entry({
        storeId: txn.storeId, entryDate: txn.createdAt,
        accountCode: '156', accountName: 'Hàng hóa',
        debit: value, referenceType: 'inventory_import', referenceId: txn.id,
        description: 'Nhập kho hàng hóa',
      }),
      this.entry({
        storeId: txn.storeId, entryDate: txn.createdAt,
        accountCode: '331', accountName: 'Phải trả cho người bán',
        credit: value, referenceType: 'inventory_import', referenceId: txn.id,
        description: 'Công nợ người bán khi nhập kho',
      }),
    ]);
  }

  // ── 3. Debt payment (Thu nợ) ─────────────────────────────────────────────
  /**
   * Ghi nhận giảm phải thu, tăng tiền mặt khi khách trả nợ.
   * Dr. 111 Tiền mặt / Cr. 131 Phải thu khách hàng
   */
  async postDebtPayment(payment: DebtPayment): Promise<void> {
    if (await this.isAlreadyPosted('debt_payment', payment.id)) return;

    const isBankOrStripe = payment.paymentMethod === 'transfer' || payment.paymentMethod === 'stripe';
    const cashAccount = isBankOrStripe ? '112' : '111';
    const cashAccountName =
      payment.paymentMethod === 'stripe'
        ? 'Cổng thanh toán Stripe'
        : payment.paymentMethod === 'transfer'
          ? 'Tiền gửi ngân hàng'
          : 'Tiền mặt';

    const methodDesc =
      payment.paymentMethod === 'stripe'
        ? 'cổng Stripe'
        : payment.paymentMethod === 'transfer'
          ? 'chuyển khoản'
          : 'tiền mặt';

    await this.accountingRepo.createMany([
      this.entry({
        storeId: payment.storeId, entryDate: payment.createdAt,
        accountCode: cashAccount, accountName: cashAccountName,
        debit: payment.amount, referenceType: 'debt_payment', referenceId: payment.id,
        description: `Thu nợ khách hàng (${methodDesc})`,
      }),
      this.entry({
        storeId: payment.storeId, entryDate: payment.createdAt,
        accountCode: '131', accountName: 'Phải thu của khách hàng',
        credit: payment.amount, referenceType: 'debt_payment', referenceId: payment.id,
        description: 'Giảm công nợ phải thu',
      }),
    ]);
  }
}