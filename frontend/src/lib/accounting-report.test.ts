import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validReportPeriod } from './accounting-period';
import { buildExportSections } from './accounting-export';
import type { DebtReport, TrialBalanceReport, BusinessResultReport } from '../hooks/useAccounting';

test('date validation handles leap days, missing dates and inverted ranges', () => {
  assert.equal(validReportPeriod('2024-02-29','2024-02-29'),true);
  assert.equal(validReportPeriod('2026-02-29','2026-03-01'),false);
  assert.equal(validReportPeriod('','2026-11-16'),false);
  assert.equal(validReportPeriod('2026-11-17','2026-11-16'),false);
});
test('exports retain credit balances and their reconciliation status', () => {
  const report = {rows:[{customerName:'Credit',customerPhone:null,openingDebt:-40,accrued:0,collected:0,closingDebt:-40,balanceStatus:'credit'}],totalOpeningDebt:-40,totalAccrued:0,totalCollected:0,totalClosingDebt:-40} as DebtReport;
  const [section] = buildExportSections(report,'debt_report');
  assert.equal(section.rows[0][6],-40);
  assert.equal(section.rows[0][7],'Dư âm — cần đối soát');
});
test('trial balance export includes totals and the discrepancy', () => {
  const report = {rows:[],totals:{openingDebit:60,openingCredit:0,debit:10,credit:0,closingDebit:70,closingCredit:0},differences:{opening:60,movement:10,closing:70}} as unknown as TrialBalanceReport;
  const [section] = buildExportSections(report,'trial_balance');
  assert.equal(section.rows[0][8],70);
  assert.equal(section.rows[1][8],70);
});
test('exported operating expenses include reversals', () => {
  const report = {rows:[{accountCode:'641',debit:15,credit:5}],totalRevenue:80,costOfGoods:40,grossProfit:40,operatingExpenses:10,netProfit:30} as BusinessResultReport;
  assert.equal(buildExportSections(report,'business_result')[0].rows[3][3],10);
});
