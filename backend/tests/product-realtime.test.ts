import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UpdateProductUseCase } from '../src/core/usecases/product/UpdateProductUseCase.js';
import { ToggleProductStatusUseCase } from '../src/core/usecases/product/ToggleProductStatusUseCase.js';
import { appEventEmitter, type ProductUpdatedEvent } from '../src/frameworks/websocket/eventEmitter.js';
import type { IProductRepository } from '../src/core/repositories/IProductRepository.js';
import { Product } from '../src/core/entities/Product.js';

const product = () => Product.create({ storeId: '11111111-1111-4111-8111-111111111111', code: 'SKU-1', name: 'Before' });

test('product event is emitted after unit sync, using the saved product store', async () => {
  const saved = product();
  const steps: string[] = [];
  const events: ProductUpdatedEvent[] = [];
  const listener = (event: ProductUpdatedEvent) => { steps.push('event'); events.push(event); };
  appEventEmitter.on('product:updated', listener);
  const repo = {
    findById: async () => saved,
    update: async () => { steps.push('save'); return saved; },
    syncUnits: async () => { steps.push('units'); return []; },
  } as unknown as IProductRepository;
  try {
    await new UpdateProductUseCase(repo).execute({ productId: saved.id, storeId: saved.storeId, name: 'After', units: [{ unitName: 'Cái', price: 10, conversionFactor: 1, isDefault: true }] });
    assert.deepEqual(steps, ['save', 'units', 'event']);
    assert.deepEqual(events, [{ storeId: saved.storeId, productId: saved.id }]);
  } finally { appEventEmitter.removeListener('product:updated', listener); }
});

test('a failed unit save does not broadcast a successful update', async () => {
  const saved = product();
  let count = 0;
  const listener = () => { count++; };
  appEventEmitter.on('product:updated', listener);
  const repo = {
    findById: async () => saved, update: async () => saved,
    syncUnits: async () => { throw new Error('save failed'); },
  } as unknown as IProductRepository;
  try {
    await assert.rejects(new UpdateProductUseCase(repo).execute({ productId: saved.id, storeId: saved.storeId, units: [{ unitName: 'Cái', price: 10, conversionFactor: 1, isDefault: true }] }), /save failed/);
    assert.equal(count, 0);
  } finally { appEventEmitter.removeListener('product:updated', listener); }
});

test('status changes also notify other sessions', async () => {
  const saved = product();
  const events: ProductUpdatedEvent[] = [];
  const listener = (event: ProductUpdatedEvent) => { events.push(event); };
  appEventEmitter.on('product:updated', listener);
  try {
    const repo = { findById: async () => saved, toggleStatus: async () => saved } as unknown as IProductRepository;
    await new ToggleProductStatusUseCase(repo).execute(saved.id);
    assert.deepEqual(events, [{ storeId: saved.storeId, productId: saved.id }]);
  } finally { appEventEmitter.removeListener('product:updated', listener); }
});
