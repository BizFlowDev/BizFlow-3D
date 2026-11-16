import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessLegacyPosting } from '../src/core/usecases/accounting/assessLegacyPosting.js';

const source = { kind:'order' as const,id:'order',date:'2026-11-01T00:00:00Z',amount:100,debtAmount:25,paymentMethod:'cash',hasItems:true,productIds:['product'] };
const line = (accountCode: string, debit: number, credit: number) => ({accountCode,debit,credit,date:source.date});
test('balanced journal is not verified when it disagrees with the source debt',()=>{
  assert.equal(assessLegacyPosting(source,[line('111',100,0),line('511',0,100)]),null);
});
test('revenue agrees with source but missing order items leave cost unresolved',()=>{
  assert.equal(assessLegacyPosting({...source,hasItems:false},[line('111',75,0),line('131',25,0),line('511',0,100)]),'missing');
});
test('legacy cost remains estimated after an internal source check',()=>{
  assert.equal(assessLegacyPosting(source,[line('111',75,0),line('131',25,0),line('511',0,100),line('632',60,0),line('156',0,60)]),'estimated');
});
test('a recorded cost is not verified when there is no import basis before the sale',()=>{
  assert.equal(assessLegacyPosting({...source,hasCostBasis:false},[line('111',75,0),line('131',25,0),line('511',0,100),line('632',60,0),line('156',0,60)]),'missing');
});
test('unexpected accounts and incorrect dates block verification',()=>{
  assert.equal(assessLegacyPosting(source,[line('111',75,0),line('131',25,0),line('511',0,100),line('999',0,0)]),null);
  assert.equal(assessLegacyPosting(source,[{...line('111',75,0),date:'2026-11-02'},line('131',25,0),line('511',0,100)]),null);
});
