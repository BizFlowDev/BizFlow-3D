import { createHash, randomUUID } from 'node:crypto';
import { query, transaction } from './connection.js';
import { assessLegacyPosting, type ReconciliationSource } from '../../core/usecases/accounting/assessLegacyPosting.js';
import { ValidationError } from '../../core/errors/ValidationError.js';
import { PostgresAccountingRepository } from './repositories/PostgresAccountingRepository.js';
import { PostgresOrderRepository } from './repositories/PostgresOrderRepository.js';
import { AutoPostingUseCase } from '../../core/usecases/accounting/AutoPostingUseCase.js';

export interface ReconciliationAction {
  kind: 'verify' | 'backfill' | 'refresh_debt';
  id: string;
  sourceType: string;
  costStatus?: 'complete' | 'estimated' | 'missing';
  before?: number;
  after?: number;
}
export interface ReconciliationPreview {
  fingerprint: string;
  actions: ReconciliationAction[];
  unresolved: { id: string; sourceType: string; reason: string }[];
  lastRun?: { auditId: string; verified: number; backfilled: number; refreshedDebt: number };
}

export class AccountingReconciliationService {
  private async inspect(storeId: string) {
    const orders = (await query('SELECT * FROM orders WHERE store_id=$1 AND status=\'confirmed\' ORDER BY id',[storeId])).rows;
    const imports = (await query('SELECT * FROM inventory_transactions WHERE store_id=$1 AND type=\'import\' ORDER BY id',[storeId])).rows;
    const payments = (await query('SELECT * FROM debt_payments WHERE store_id=$1 ORDER BY id',[storeId])).rows;
    const entries = (await query('SELECT * FROM accounting_entries WHERE store_id=$1 ORDER BY id',[storeId])).rows;
    const postings = (await query('SELECT * FROM accounting_postings WHERE store_id=$1 ORDER BY id',[storeId])).rows;
    const items = (await query('SELECT i.* FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.store_id=$1 ORDER BY i.id',[storeId])).rows;
    const customers = (await query(`SELECT c.id,c.debt_balance,
      COALESCE((SELECT SUM(o.debt_amount) FROM orders o WHERE o.store_id=$1 AND o.customer_id=c.id AND o.status='confirmed'),0)
      -COALESCE((SELECT SUM(p.amount) FROM debt_payments p WHERE p.store_id=$1 AND p.customer_id=c.id),0) AS source_balance
      FROM customers c WHERE c.store_id=$1 ORDER BY c.id`,[storeId])).rows;
    const sources: ReconciliationSource[] = [
      ...orders.map(o=>{
        const lines=items.filter(i=>i.order_id===o.id);
        return {kind:'order' as const,id:o.id,date:new Date(o.confirmed_at ?? o.updated_at).toISOString(),amount:Number(o.final_amount),debtAmount:Number(o.debt_amount),paymentMethod:o.payment_method,
          hasCostBasis:lines.length>0 && lines.every(line=>imports.some(i=>i.product_id===line.product_id && new Date(i.created_at).getTime()<=new Date(o.confirmed_at ?? o.updated_at).getTime() && entries.some(e=>e.reference_type==='inventory_import' && e.reference_id===i.id && e.account_code==='156'))),
          hasItems:lines.length>0 && lines.reduce((sum,i)=>sum+Number(i.total_price),0)===Number(o.total_amount),productIds:[...new Set<string>(lines.map(i=>i.product_id))]};
      }),
      ...imports.map(i=>({kind:'inventory_import' as const,id:i.id,date:new Date(i.created_at).toISOString(),amount:0,productIds:[i.product_id]})),
      ...payments.map(p=>({kind:'debt_payment' as const,id:p.id,date:new Date(p.created_at).toISOString(),amount:Number(p.amount),paymentMethod:p.payment_method,productIds:[]})),
    ];
    const actions: ReconciliationAction[] = [], unresolved: ReconciliationPreview['unresolved'] = [];
    for (const source of sources) {
      const posted = postings.find(p=>p.reference_type===source.kind && p.reference_id===source.id);
      if (posted) {
        if (posted.cost_status==='missing') unresolved.push({id:source.id,sourceType:source.kind,reason:'Chưa đủ căn cứ giá vốn; cần chứng từ gốc.'});
        continue;
      }
      const lines=entries.filter(e=>e.reference_type===source.kind && e.reference_id===source.id);
      if (!lines.length && source.kind==='order' && Number.isSafeInteger(source.amount) && source.amount>=0 &&
        Number.isSafeInteger(source.debtAmount) && (source.debtAmount ?? -1)>=0 && (source.debtAmount ?? -1)<=source.amount) {
        actions.push({kind:'backfill',id:source.id,sourceType:source.kind,costStatus:source.hasItems && source.hasCostBasis ? 'estimated' : 'missing'});
        if (!source.hasItems || !source.hasCostBasis) unresolved.push({id:source.id,sourceType:source.kind,reason:'Chưa đủ chi tiết hàng hoặc giá nhập trước ngày bán; chỉ bổ sung doanh thu/công nợ có căn cứ.'});
        continue;
      }
      const status=assessLegacyPosting(source,lines.map(e=>({accountCode:e.account_code,debit:Number(e.debit_amount),credit:Number(e.credit_amount),date:new Date(e.entry_date).toISOString()})));
      if (status) {
        actions.push({kind:'verify',id:source.id,sourceType:source.kind,costStatus:status});
        if (status==='missing') unresolved.push({id:source.id,sourceType:source.kind,reason:'Bút toán doanh thu/công nợ khớp, nhưng chưa đủ căn cứ xác minh giá vốn.'});
      } else unresolved.push({id:source.id,sourceType:source.kind,reason:'Chưa thể tự đối soát: thiếu bút toán hoặc bút toán không khớp dữ liệu gốc.'});
    }
    for (const c of customers) {
      const before=Number(c.debt_balance),after=Number(c.source_balance);
      if (Number.isSafeInteger(after) && before!==after) actions.push({kind:'refresh_debt',id:c.id,sourceType:'customer',before,after});
    }
    const sourceKeys=new Set(sources.map(s=>`${s.kind}:${s.id}`));
    for (const key of new Set<string>(entries.map(e=>`${e.reference_type}:${e.reference_id}`))) {
      if (!sourceKeys.has(key)) {
        const [sourceType,id]=key.split(':');
        unresolved.push({id,sourceType,reason:'Bút toán không còn giao dịch gốc; giữ nguyên để kiểm tra chứng từ, không tự xóa.'});
      }
    }
    const fingerprint=createHash('sha256').update(JSON.stringify({orders,imports,payments,entries,postings,items,customers})).digest('hex');
    return { preview:{fingerprint,actions,unresolved},sources };
  }

  async preview(storeId: string): Promise<ReconciliationPreview> {
    return transaction(async()=>{
      await query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const preview: ReconciliationPreview = (await this.inspect(storeId)).preview;
      const last = (await query(`SELECT id,old_values->'actions' AS actions FROM audit_logs
        WHERE store_id=$1 AND entity_type='accounting_reconciliation' ORDER BY created_at DESC,id DESC LIMIT 1`,[storeId])).rows[0];
      if (last && Array.isArray(last.actions)) preview.lastRun = { auditId:last.id,
        verified:last.actions.filter((a: ReconciliationAction)=>a.kind==='verify').length,
        backfilled:last.actions.filter((a: ReconciliationAction)=>a.kind==='backfill').length,
        refreshedDebt:last.actions.filter((a: ReconciliationAction)=>a.kind==='refresh_debt').length };
      return preview;
    });
  }

  async apply(storeId: string, fingerprint: string, actorId: string | null): Promise<ReconciliationPreview & { auditId: string | null }> {
    return transaction(async()=>{
      await query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`reconciliation:${storeId}`]);
      // Same lock order as confirmation: orders, customers, products.
      for (const table of ['orders','customers','products']) await query(`SELECT id FROM ${table} WHERE store_id=$1 ORDER BY id FOR UPDATE`,[storeId]);
      const {preview,sources}=await this.inspect(storeId);
      if (fingerprint!==preview.fingerprint) throw new ValidationError('Dữ liệu đã thay đổi. Vui lòng xem trước đối soát lại.');
      if (!preview.actions.length) return {...preview,auditId:null};
      const repo=new PostgresAccountingRepository(),orderRepo=new PostgresOrderRepository();
      for (const action of preview.actions) {
        if (action.kind==='refresh_debt') {
          // This is a derived cache. Source orders/payments and their amounts are untouched.
          await query('UPDATE customers SET debt_balance=$1,updated_at=NOW() WHERE id=$2 AND store_id=$3',[action.after,action.id,storeId]);
        } else if (action.kind==='verify') {
          const source=sources.find(s=>s.id===action.id && s.kind===action.sourceType)!;
          await query(`INSERT INTO accounting_postings(store_id,reference_type,reference_id,entry_date,cost_status,missing_product_ids)
            VALUES($1,$2,$3,$4,$5,$6)`,[storeId,source.kind,source.id,source.date,action.costStatus,action.costStatus==='missing'?source.productIds:[]]);
        } else {
          const source=sources.find(s=>s.kind==='order' && s.id===action.id)!;
          const order=await orderRepo.findById(action.id);
          if (!order) throw new ValidationError('Không tìm thấy đơn cần bổ sung');
          await new AutoPostingUseCase(repo).postOrderConfirmed(order,source.hasItems ? await orderRepo.findItemsByOrderId(order.id) : []);
        }
      }
      const auditId=randomUUID();
      const backfilledIds=preview.actions.filter(a=>a.kind==='backfill').map(a=>a.id);
      const createdJournalEntries=backfilledIds.length ? (await query(`SELECT id,reference_type,reference_id,account_code,debit_amount,credit_amount,entry_date
        FROM accounting_entries WHERE store_id=$1 AND reference_type='order' AND reference_id=ANY($2::uuid[]) ORDER BY id`,[storeId,backfilledIds])).rows : [];
      await query(`INSERT INTO audit_logs(id,store_id,user_id,action,entity_type,entity_id,old_values,new_values)
        VALUES($1,$2,$3,'update','accounting_reconciliation',$1,$4,$5)`,[auditId,storeId,actorId,
        JSON.stringify({fingerprint:preview.fingerprint,actions:preview.actions}),
        JSON.stringify({method:'internal_source_journal_check',externalReceiptsVerified:false,createdJournalEntries,unresolved:preview.unresolved})]);
      return {...preview,auditId};
    });
  }
}
