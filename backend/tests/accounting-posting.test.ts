import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AutoPostingUseCase } from '../src/core/usecases/accounting/AutoPostingUseCase.js';
import type { IAccountingRepository } from '../src/core/repositories/IAccountingRepository.js';
import type { Order } from '../src/core/entities/Order.js';
import type { OrderItem } from '../src/core/entities/OrderItem.js';

test('missing cost keeps revenue balanced without substituting selling price', async () => {
  const writes: any[] = [];
  const repo = {
    findByReference: async () => [],
    createMany: async (entries: any[]) => { writes.push({ entries }); return entries; },
    postBalanced: async (posting: any) => { writes.push(posting); },
    getProductAverageCosts: async () => new Map(),
    getUnitConversionFactors: async () => new Map(),
  } as unknown as IAccountingRepository;
  await new AutoPostingUseCase(repo).postOrderConfirmed({ id: '22222222-2222-4222-8222-222222222222', storeId: '11111111-1111-4111-8111-111111111111', finalAmount: 100, debtAmount: 25, paymentMethod: 'cash', confirmedAt: new Date() } as Order,
    [{ productId: '33333333-3333-4333-8333-333333333333', quantity: 1, totalPrice: 100 }] as OrderItem[]);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].costStatus, 'missing');
  assert.deepEqual(writes[0].missingProductIds, ['33333333-3333-4333-8333-333333333333']);
  assert.equal(writes[0].entries.some((e: any) => e.accountCode === '632'), false);
  assert.equal(writes[0].entries.reduce((s: number, e: any) => s + e.debitAmount - e.creditAmount, 0), 0);
});
test('known costs use base-unit quantities and the confirmation-time cutoff; zero is a known cost', async () => {
  const date = new Date('2026-11-16T01:00:00Z');
  for (const [unitCost, expected] of [[10,120],[0,0]]) {
    let saved: any;
    const repo = {
      getProductAverageCosts: async (_store: string, _products: string[], asOf: Date) => { assert.equal(asOf,date); return new Map([['product',unitCost]]); },
      getUnitConversionFactors: async () => new Map([['unit',6]]),
      postBalanced: async (posting: any) => { saved=posting; },
    } as unknown as IAccountingRepository;
    await new AutoPostingUseCase(repo).postOrderConfirmed({ id:'22222222-2222-4222-8222-222222222222',storeId:'11111111-1111-4111-8111-111111111111',finalAmount:200,debtAmount:0,paymentMethod:'cash',confirmedAt:date } as Order,
      [{productId:'product',productUnitId:'unit',quantity:2,totalPrice:200}] as OrderItem[]);
    assert.equal(saved.costStatus,'estimated');
    assert.deepEqual(saved.missingProductIds,[]);
    assert.equal(saved.entries.find((e: any)=>e.accountCode==='632')?.debitAmount ?? 0,expected);
  }
});
