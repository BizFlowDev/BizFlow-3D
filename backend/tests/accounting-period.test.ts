import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportPeriod } from '../src/core/usecases/accounting/reportPeriod.js';

test('report date range includes the whole Vietnam day without including next midnight', () => {
  const range = reportPeriod('2026-11-16','2026-11-16');
  assert.equal(range.from.toISOString(),'2026-11-15T17:00:00.000Z');
  assert.equal(range.to.toISOString(),'2026-11-16T17:00:00.000Z');
});
test('invalid dates and query arrays are rejected', () => {
  for (const input of ['2026-02-29','2026-13-01','2026-11-16T00:00:00Z','', ['2026-11-16'], undefined]) {
    assert.throws(()=>reportPeriod(input,'2026-11-16'));
  }
  assert.throws(()=>reportPeriod('2026-11-17','2026-11-16'));
});
