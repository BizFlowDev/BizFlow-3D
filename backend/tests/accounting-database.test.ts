import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { query, transaction, getPool, closePool } from '../src/frameworks/database/connection.js';
import { PostgresUnitOfWork } from '../src/frameworks/database/PostgresUnitOfWork.js';
import { PostgresAccountingRepository } from '../src/frameworks/database/repositories/PostgresAccountingRepository.js';
import { PostgresOrderRepository } from '../src/frameworks/database/repositories/PostgresOrderRepository.js';
import { PostgresCustomerRepository } from '../src/frameworks/database/repositories/PostgresCustomerRepository.js';
import { PostgresInventoryRepository } from '../src/frameworks/database/repositories/PostgresInventoryRepository.js';
import { PostgresProductRepository } from '../src/frameworks/database/repositories/PostgresProductRepository.js';
import { PostgresDebtPaymentRepository } from '../src/frameworks/database/repositories/PostgresDebtPaymentRepository.js';
import { AutoPostingUseCase } from '../src/core/usecases/accounting/AutoPostingUseCase.js';
import { ConfirmOrderUseCase } from '../src/core/usecases/order/ConfirmOrderUseCase.js';
import { ImportStockUseCase } from '../src/core/usecases/inventory/ImportStockUseCase.js';
import { RecordDebtPaymentUseCase } from '../src/core/usecases/debt/RecordDebtPaymentUseCase.js';
import type { AccountingEntry } from '../src/core/entities/AccountingEntry.js';
import { appEventEmitter } from '../src/frameworks/websocket/eventEmitter.js';
import { AccountingReconciliationService } from '../src/frameworks/database/AccountingReconciliationService.js';

test('PostgreSQL: rollback, concurrent retries, debt locks and report queries', { skip: process.env.RUN_ACCOUNTING_DB_TESTS !== '1', timeout: 180000 }, async t => {
  // No business data is modified: every fixture lives in this disposable schema.
  const schema = `accounting_test_${randomUUID().replaceAll('-', '')}`;
  assert.match(schema, /^accounting_test_[a-f0-9]{32}$/);
  class TestUnitOfWork extends PostgresUnitOfWork {
    override run<T>(work: () => Promise<T>): Promise<T> {
      return transaction(async () => { await query(`SET LOCAL search_path TO ${schema}, public`); return work(); });
    }
  }
  const uow = new TestUnitOfWork();
  const store = randomUUID(), otherStore = randomUUID(), product = randomUUID(), unit = randomUUID(), customer = randomUUID(), order = randomUUID(), user = randomUUID();
  const journal = new PostgresAccountingRepository(), orders = new PostgresOrderRepository(), customers = new PostgresCustomerRepository();
  const inventory = new PostgresInventoryRepository(), products = new PostgresProductRepository(), payments = new PostgresDebtPaymentRepository();
  const posting = new AutoPostingUseCase(journal);
  class FailingJournal extends PostgresAccountingRepository {
    override async createMany(entries: AccountingEntry[]) { await super.createMany(entries); throw new Error('injected posting failure'); }
  }
  await getPool().query(`CREATE SCHEMA ${schema}`);
  try {
    await uow.run(async () => {
      for (const table of ['stores','users','products','product_units','customers','orders','order_items','inventory_transactions','debt_payments','account_chart','accounting_entries','accounting_postings','audit_logs']) {
        await query(`CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`);
      }
      await query('INSERT INTO account_chart SELECT * FROM public.account_chart');
      await query('CREATE TRIGGER debt_balance AFTER INSERT OR UPDATE OR DELETE ON debt_payments FOR EACH ROW EXECUTE FUNCTION public.update_customer_debt_balance()');
      await query('INSERT INTO stores(id,name) VALUES($1,\'Fixture\'),($2,\'Other\')', [store,otherStore]);
      await query('INSERT INTO products(id,store_id,code,name) VALUES($1,$2,\'FIXTURE\',\'Fixture\')', [product,store]);
      await query('INSERT INTO product_units(id,product_id,unit_name,conversion_factor,price,is_default) VALUES($1,$2,\'item\',1,100,true)', [unit,product]);
      await query('INSERT INTO customers(id,store_id,name,debt_balance,credit_limit) VALUES($1,$2,\'Fixture\',100,1000)', [customer,store]);
      await query('INSERT INTO orders(id,store_id,customer_id,total_amount,final_amount,debt_amount) VALUES($1,$2,$3,100,100,40)', [order,store,customer]);
      await query('INSERT INTO order_items(order_id,product_id,product_unit_id,quantity,unit_price,total_price) VALUES($1,$2,$3,1,100,100)', [order,product,unit]);
    });
    await t.test('import failure rolls back inventory and metadata', async () => {
      const failing = new ImportStockUseCase(inventory,products,new AutoPostingUseCase(new FailingJournal()),uow);
      await assert.rejects(failing.execute({storeId:store,productId:product,productUnitId:unit,quantity:2,unitCost:60}), /injected/);
      await uow.run(async () => assert.equal((await query('SELECT * FROM inventory_transactions')).rowCount,0));
    });
    await new ImportStockUseCase(inventory,products,posting,uow).execute({storeId:store,productId:product,productUnitId:unit,quantity:10,unitCost:60});
    await t.test('confirmation failure rolls back order, stock, debt, journal and events', async () => {
      let emitted = 0;
      const listener = () => { emitted++; };
      appEventEmitter.on('order:confirmed',listener);
      try {
        await assert.rejects(new ConfirmOrderUseCase(orders,inventory,customers,new AutoPostingUseCase(new FailingJournal()),uow,products).execute(order,user,store), /injected/);
        await uow.run(async () => {
          assert.equal((await orders.findById(order))?.status,'draft');
          assert.equal((await customers.findById(customer))?.debtBalance,100);
          assert.equal((await query("SELECT * FROM inventory_transactions WHERE type='export'")).rowCount,0);
          assert.equal((await query("SELECT * FROM accounting_postings WHERE reference_type='order'")).rowCount,0);
          assert.equal((await journal.findByReference('order',order)).length,0);
        });
        assert.equal(emitted,0);
      } finally { appEventEmitter.off('order:confirmed',listener); }
    });
    await t.test('two simultaneous confirmations create one balanced posting', async () => {
      const confirm = new ConfirmOrderUseCase(orders,inventory,customers,posting,uow,products);
      await Promise.all([confirm.execute(order,user,store),confirm.execute(order,user,store)]);
      await uow.run(async () => {
        assert.equal((await customers.findById(customer))?.debtBalance,140);
        assert.equal((await query("SELECT * FROM inventory_transactions WHERE type='export'")).rowCount,1);
        assert.equal((await query("SELECT * FROM accounting_postings WHERE reference_type='order'")).rowCount,1);
        const entries = await journal.findByReference('order',order);
        assert.equal(entries.length,5);
        assert.equal(entries.reduce((s,e)=>s+e.debitAmount-e.creditAmount,0),0);
      });
    });
    await t.test('a stale cancellation cannot change a confirmed accounting source', async () => {
      await uow.run(async () => {
        await assert.rejects(orders.update(order,{status:'cancelled'}));
        assert.equal((await orders.findById(order))?.status,'confirmed');
      });
    });
    await t.test('payment failure rolls back the debt trigger; concurrent payments cannot overcollect', async () => {
      const input = {storeId:store,customerId:customer,amount:100,paymentMethod:'cash' as const};
      await assert.rejects(new RecordDebtPaymentUseCase(payments,customers,new AutoPostingUseCase(new FailingJournal()),uow,orders).execute(input), /injected/);
      await uow.run(async () => assert.equal((await customers.findById(customer))?.debtBalance,140));
      const pay = new RecordDebtPaymentUseCase(payments,customers,posting,uow,orders);
      const results = await Promise.allSettled([pay.execute(input),pay.execute(input)]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      await uow.run(async () => {
        assert.equal((await customers.findById(customer))?.debtBalance,40);
        assert.equal((await query('SELECT * FROM debt_payments')).rowCount,1);
      });
    });
    await t.test('cross-store writes fail before changing data', async () => {
      await assert.rejects(new ConfirmOrderUseCase(orders,inventory,customers,posting,uow,products).execute(order,user,otherStore));
      await assert.rejects(new ImportStockUseCase(inventory,products,posting,uow).execute({storeId:otherStore,productId:product,quantity:1,unitCost:10}));
      await assert.rejects(new RecordDebtPaymentUseCase(payments,customers,posting,uow,orders).execute({storeId:otherStore,customerId:customer,amount:1,paymentMethod:'cash'}));
    });
    await t.test('SQL reports retain settled customers, group accounts, and use confirmation dates', async () => {
      const c = randomUUID(), o = randomUUID();
      await uow.run(async () => {
        await query('INSERT INTO customers(id,store_id,name,debt_balance) VALUES($1,$2,\'Settled\',100)',[c,otherStore]);
        await query(`INSERT INTO orders(id,store_id,customer_id,status,final_amount,debt_amount,created_at,confirmed_at) VALUES($1,$2,$3,'confirmed',100,100,'2026-10-01','2026-10-20')`,[o,otherStore,c]);
        await query("INSERT INTO debt_payments(store_id,customer_id,amount,payment_method,created_at) VALUES($1,$2,100,'cash','2026-11-02')",[otherStore,c]);
        await query(`INSERT INTO accounting_entries(store_id,entry_date,account_code,account_name,debit_amount,credit_amount,reference_type,reference_id)
          VALUES($1,'2026-10-01','112','Old bank name',100,0,'order',$2),($1,'2026-10-02','112','Another bank name',0,40,'order',$2),($1,'2026-11-01','112','Bank',10,0,'order',$2),($1,'2026-12-01','112','Bank',999,0,'order',$2)`,[otherStore,o]);
        const from = new Date('2026-11-01T00:00:00Z'),to = new Date('2026-12-01T00:00:00Z');
        const debt = await journal.getDebtMovement(otherStore,from,to);
        assert.equal(debt.length,1); assert.equal(debt[0].closingDebt,0); assert.equal(debt[0].collected,100);
        const balance = await journal.getTrialBalance(otherStore,from,to);
        assert.equal(balance.length,1); assert.equal(balance[0].openingDebit,60); assert.equal(balance[0].closingDebit,70);
        const revenue = await journal.getRevenueLedger(otherStore,new Date('2026-10-20T00:00:00Z'),new Date('2026-10-21T00:00:00Z'));
        assert.equal(revenue[0].totalRevenue,100);
        await journal.getBusinessResult(otherStore,from,to);
        await journal.getReportWarnings(otherStore,from,to);
      });
    });
    await t.test('reconciliation previews changes, refuses stale plans, backfills once and audits repairs', async () => {
      // Keep the same production service, with the fixture schema on each operation's transaction.
      const service = new AccountingReconciliationService();
      const store3=randomUUID(),c3=randomUUID(),o3=randomUUID();
      await uow.run(async()=>{
        await query('INSERT INTO stores(id,name) VALUES($1,\'Reconcile\')',[store3]);
        await query('INSERT INTO customers(id,store_id,name,debt_balance) VALUES($1,$2,\'Reconcile\',999)',[c3,store3]);
        await query(`INSERT INTO orders(id,store_id,customer_id,status,total_amount,final_amount,debt_amount,confirmed_at) VALUES($1,$2,$3,'confirmed',100,100,50,NOW())`,[o3,store3,c3]);
      });
      const preview = await uow.run(()=>service.preview(store3));
      assert.equal(preview.actions.filter(a=>a.kind==='backfill').length,1);
      assert.equal(preview.actions.find(a=>a.kind==='refresh_debt')?.after,50);
      await uow.run(()=>query('UPDATE orders SET note=\'changed\' WHERE id=$1',[o3]));
      await assert.rejects(uow.run(()=>service.apply(store3,preview.fingerprint,null)),/thay đổi/);
      const fresh=await uow.run(()=>service.preview(store3));
      const result=await uow.run(()=>service.apply(store3,fresh.fingerprint,null));
      assert.ok(result.auditId);
      await uow.run(async()=>{
        const lines=await journal.findByReference('order',o3);
        assert.equal(lines.length,3);
        assert.equal(lines.find(e=>e.accountCode==='131')?.debitAmount,50);
        assert.equal(lines.reduce((sum,e)=>sum+e.debitAmount-e.creditAmount,0),0);
        assert.equal((await customers.findById(c3))?.debtBalance,50);
        assert.equal((await query('SELECT cost_status FROM accounting_postings WHERE reference_id=$1',[o3])).rows[0].cost_status,'missing');
        assert.equal((await query('SELECT * FROM audit_logs WHERE entity_id=$1',[result.auditId])).rowCount,1);
      });
      const again=await uow.run(()=>service.preview(store3));
      assert.equal(again.actions.length,0);
      const noop=await uow.run(()=>service.apply(store3,again.fingerprint,null));
      assert.equal(noop.auditId,null);
      await uow.run(async()=>assert.equal((await journal.findByReference('order',o3)).length,3));
    });
  } finally {
    await getPool().query(`DROP SCHEMA ${schema} CASCADE`);
    await closePool();
  }
});
