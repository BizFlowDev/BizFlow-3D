import { query, transaction, closePool } from './connection.js';
import { PostgresAccountingRepository } from './repositories/PostgresAccountingRepository.js';
import { reportPeriod } from '../../core/usecases/accounting/reportPeriod.js';

async function main() {
  const args = process.argv.slice(2);
  const option = (name: string) => args[args.indexOf(name) + 1];
  const storeId = option('--store-id');
  if (!args.includes('--store-id') || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(storeId ?? '')) {
    throw new Error('Usage: npm run accounting:reconcile -- --store-id UUID --from YYYY-MM-DD --to YYYY-MM-DD');
  }
  const period = reportPeriod(args.includes('--from') ? option('--from') : undefined, args.includes('--to') ? option('--to') : undefined);
  const result = await transaction(async () => {
    await query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const repo = new PostgresAccountingRepository();
    const warnings = await repo.getReportWarnings(storeId, period.from, period.to);
    const balance = await repo.getTrialBalance(storeId, period.from, period.to);
    const postings = await query(`WITH sources AS (
      SELECT 'order' AS type,id,COALESCE(confirmed_at,updated_at) AS date FROM orders WHERE store_id=$1 AND status='confirmed'
      UNION ALL SELECT 'inventory_import',id,created_at FROM inventory_transactions WHERE store_id=$1 AND type='import'
      UNION ALL SELECT 'debt_payment',id,created_at FROM debt_payments WHERE store_id=$1
    ), journal AS (
      SELECT reference_type,reference_id,COUNT(*) AS rows,SUM(debit_amount-credit_amount) AS difference
      FROM accounting_entries WHERE store_id=$1 AND entry_date<$2 GROUP BY reference_type,reference_id
    ) SELECT COALESCE(s.type,j.reference_type) AS type,COALESCE(s.id,j.reference_id) AS id,
      COALESCE(j.rows,0) AS rows,COALESCE(j.difference,0) AS difference,
      CASE WHEN s.id IS NULL THEN 'orphan' WHEN j.reference_id IS NULL THEN 'missing' WHEN j.difference<>0 THEN 'unbalanced'
        WHEN p.id IS NULL THEN 'legacy_unverified' ELSE p.cost_status END AS status
    FROM sources s FULL JOIN journal j ON j.reference_type=s.type AND j.reference_id=s.id
    LEFT JOIN accounting_postings p ON p.store_id=$1 AND p.reference_type=COALESCE(s.type,j.reference_type) AND p.reference_id=COALESCE(s.id,j.reference_id)
    WHERE (s.date<$2 OR s.id IS NULL) AND (s.id IS NULL OR j.reference_id IS NULL OR j.difference<>0 OR p.id IS NULL OR p.cost_status='missing')
    ORDER BY type,id`, [storeId,period.to]);
    const duplicates = await query(`SELECT reference_type,reference_id,account_code,debit_amount,credit_amount,COUNT(*) AS copies
      FROM accounting_entries WHERE store_id=$1 AND entry_date<$2
      GROUP BY reference_type,reference_id,account_code,debit_amount,credit_amount HAVING COUNT(*)>1`, [storeId,period.to]);
    const debt = await query(`SELECT c.id,c.debt_balance AS cached_balance,
      COALESCE((SELECT SUM(o.debt_amount) FROM orders o WHERE o.customer_id=c.id AND o.store_id=$1 AND o.status='confirmed'),0)
      -COALESCE((SELECT SUM(p.amount) FROM debt_payments p WHERE p.customer_id=c.id AND p.store_id=$1),0) AS source_balance
      FROM customers c WHERE c.store_id=$1`, [storeId]);
    return { storeId, period, warnings, balance, postings:postings.rows, suspectedDuplicates:duplicates.rows,
      currentDebtDifferences:debt.rows.filter(r => Number(r.cached_balance)!==Number(r.source_balance)) };
  });
  console.log(JSON.stringify(result,null,2));
}

main().catch(error => { console.error(error.message); process.exitCode=1; }).finally(closePool);
