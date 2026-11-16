import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GenerateFinancialReportUseCase } from '../src/core/usecases/accounting/GenerateFinancialReportUseCase.js';
import type { IAccountingRepository } from '../src/core/repositories/IAccountingRepository.js';

const from = new Date('2026-11-01T00:00:00+07:00');
const to = new Date('2026-12-01T00:00:00+07:00');
function report(repo: Partial<IAccountingRepository> = {}) {
  return new GenerateFinancialReportUseCase({ getReportWarnings: async () => [], ...repo } as IAccountingRepository);
}
test('invalid dates are rejected before querying reports', async () => {
  await assert.rejects(report().execute('store', 'revenue_ledger', new Date('invalid'), to), /ngày|Ngày/);
});
test('business results use net movements, including reversals', async () => {
  const result = await report({ getBusinessResult: async () => [
    { accountCode: '511', accountName: 'Revenue', debit: 20, credit: 100 },
    { accountCode: '632', accountName: 'Cost', debit: 50, credit: 10 },
    { accountCode: '641', accountName: 'Expense', debit: 15, credit: 5 },
  ] }).execute('store', 'business_result', from, to);
  assert.equal(result.type, 'business_result');
  if (result.type !== 'business_result') return;
  assert.equal(result.totalRevenue, 80);
  assert.equal(result.costOfGoods, 40);
  assert.equal(result.operatingExpenses, 10);
  assert.equal(result.netProfit, 30);
});
test('credit balances remain signed and are separate from receivables', async () => {
  const result = await report({ getDebtMovement: async () => [
    { customerId: 'a', customerName: 'A', customerPhone: null, openingDebt: 100, accrued: 0, collected: 100, closingDebt: 0 },
    { customerId: 'b', customerName: 'B', customerPhone: null, openingDebt: -40, accrued: 0, collected: 0, closingDebt: -40 },
    { customerId: 'c', customerName: 'C', customerPhone: null, openingDebt: 20, accrued: 0, collected: 0, closingDebt: 20 },
  ] }).execute('store', 'debt_report', from, to);
  if (result.type !== 'debt_report') throw Error('wrong report');
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[1].closingDebt, -40);
  assert.equal(result.rows[1].balanceStatus, 'credit');
  assert.equal(result.totalReceivable, 20);
  assert.equal(result.totalCreditBalance, 40);
});
