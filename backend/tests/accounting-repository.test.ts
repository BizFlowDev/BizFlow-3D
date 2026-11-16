import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PostgresAccountingRepository } from '../src/frameworks/database/repositories/PostgresAccountingRepository.js';
import { query } from '../src/frameworks/database/connection.js';

test('trial balance nets both sides of opening movements', async () => {
  const repo = new PostgresAccountingRepository((async () => ({ rows: [
    { accountCode: '131', accountName: 'Receivables', accountType: 'asset', openingDebit: '100', openingCredit: '40', debit: '10', credit: '0' },
    { accountCode: '331', accountName: 'Payables', accountType: 'liability', openingDebit: '30', openingCredit: '100', debit: '10', credit: '0' },
  ] })) as unknown as typeof query);
  const rows = await repo.getTrialBalance('store', new Date('2026-11-01'), new Date('2026-12-01'));
  assert.deepEqual(rows.map(r => [r.openingDebit, r.openingCredit, r.closingDebit, r.closingCredit]), [[60, 0, 70, 0], [0, 70, 0, 60]]);
});
