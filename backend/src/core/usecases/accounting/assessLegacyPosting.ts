export interface ReconciliationSource {
  kind: 'order' | 'inventory_import' | 'debt_payment';
  id: string;
  date: string;
  amount: number;
  debtAmount?: number;
  paymentMethod?: string;
  hasItems?: boolean;
  hasCostBasis?: boolean;
  productIds: string[];
}
export interface LegacyLine { accountCode: string; debit: number; credit: number; date: string }

/** Verifies internal source/journal agreement, never certifies external receipts. */
export function assessLegacyPosting(source: ReconciliationSource, entries: LegacyLine[]): 'complete' | 'estimated' | 'missing' | null {
  if (!entries.length || !Number.isSafeInteger(source.amount) || source.amount < 0 || !Number.isFinite(Date.parse(source.date))) return null;
  const amounts = new Map<string, number>();
  for (const e of entries) {
    if (!Number.isSafeInteger(e.debit) || !Number.isSafeInteger(e.credit) || e.debit < 0 || e.credit < 0 ||
      (e.debit > 0 && e.credit > 0) || Date.parse(e.date) !== Date.parse(source.date)) return null;
    amounts.set(e.accountCode, (amounts.get(e.accountCode) ?? 0) + e.debit - e.credit);
  }
  if (entries.reduce((sum,e)=>sum+BigInt(e.debit)-BigInt(e.credit),0n)!==0n) return null;
  const net = (code: string) => amounts.get(code) ?? 0;
  const allowed = source.kind === 'order' ? ['111','112','131','511','632','156'] : source.kind === 'inventory_import' ? ['156','331'] : ['111','112','131'];
  if ([...amounts.keys()].some(code=>!allowed.includes(code))) return null;
  if (source.kind === 'inventory_import') return net('156') >= 0 && net('156') === -net('331') ? 'estimated' : null;
  const cash = source.paymentMethod === 'cash' || source.paymentMethod === 'debt' ? '111' : '112';
  const otherCash = cash === '111' ? '112' : '111';
  if (net(otherCash)!==0) return null;
  if (source.kind === 'debt_payment') return net(cash)===source.amount && net('131')===-source.amount ? 'complete' : null;
  const debt = source.debtAmount ?? 0;
  if (!Number.isSafeInteger(debt) || debt < 0 || debt > source.amount || net(cash)!==source.amount-debt || net('131')!==debt || net('511')!==-source.amount || net('632') < 0 || net('632')!==-net('156')) return null;
  return source.hasItems && source.hasCostBasis !== false && net('632')>0 ? 'estimated' : 'missing';
}
