import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import jwt from 'jsonwebtoken';
import env from '../src/config/index.js';
import { initSocketServer } from '../src/frameworks/websocket/socketServer.js';
import { initEventListeners } from '../src/frameworks/websocket/eventEmitter.js';
import { UpdateProductUseCase } from '../src/core/usecases/product/UpdateProductUseCase.js';
import { Product } from '../src/core/entities/Product.js';
import type { IProductRepository } from '../src/core/repositories/IProductRepository.js';
import { AdminController } from '../src/adapters/controllers/AdminController.js';

// This integration exercises the client library used by the sibling frontend.
const { io: connect } = createRequire(resolve(__dirname, '../../frontend/package.json'))('socket.io-client');

function received(socket: any, event: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error(`Timeout: ${event}`)); }, 4000);
    const handler = (payload: unknown) => { cleanup(); resolve(payload); };
    const failure = (error: Error) => { cleanup(); reject(error); };
    const cleanup = () => { clearTimeout(timeout); socket.off(event, handler); socket.off('connect_error', failure); };
    socket.once(event, handler);
    socket.once('connect_error', failure);
  });
}

test('live product updates stay in their store and announcements retain database identity', { timeout: 15000 }, async () => {
  const http = createServer();
  const server = initSocketServer(http);
  initEventListeners();
  const clients: any[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      http.once('error', reject);
      http.listen(0, '127.0.0.1', resolve);
    });
    const address = http.address();
    assert.ok(address && typeof address !== 'string');
    const storeId = '11111111-1111-4111-8111-111111111111';
    for (const [userId, store] of [['owner', storeId], ['staff', storeId], ['other', 'other-store'], ['admin', null]]) {
      const socket = connect(`http://127.0.0.1:${address.port}`, {
        autoConnect: false, reconnection: false, transports: ['websocket'],
        auth: { token: jwt.sign({ userId, storeId: store, role: store ? 'owner' : 'admin' }, env.JWT_SECRET) },
      });
      clients.push(socket);
      const ready = received(socket, 'connect');
      socket.connect();
      await ready;
    }
    const [owner, staff, other, admin] = clients;
    let foreignUpdates = 0;
    other.on('product_updated', () => { foreignUpdates++; });
    const ownerUpdate = received(owner, 'product_updated');
    const staffUpdate = received(staff, 'product_updated');
    const saved = Product.create({ storeId, code: 'SKU-1', name: 'Updated product' });
    const repo = { findById: async () => saved, update: async () => saved, findUnitsByProductId: async () => [] } as unknown as IProductRepository;
    await new UpdateProductUseCase(repo).execute({ productId: saved.id, storeId, name: saved.name });
    assert.deepEqual(await ownerUpdate, { productId: saved.id });
    assert.deepEqual(await staffUpdate, { productId: saved.id });
    const barrier = received(other, 'test:barrier');
    server.to('user:other').emit('test:barrier');
    await barrier;
    assert.equal(foreignUpdates, 0);

    const announcement = { id: 'database-announcement-id', title: 'Announcement', content: 'Message', createdBy: 'admin', createdAt: '2026-11-16T00:00:00Z' };
    const deps = Array(12).fill(undefined);
    deps[7] = { create: async () => announcement };
    const controller = new AdminController(...deps as ConstructorParameters<typeof AdminController>);
    let senderNotifications = 0;
    admin.on('notification', () => { senderNotifications++; });
    const deliveries = [owner, staff, other].map((socket) => received(socket, 'notification'));
    let error: unknown;
    const response = { status: () => response, json: () => {} };
    await controller.createAnnouncement({ body: { title: announcement.title, content: announcement.content }, user: { userId: 'admin' } } as never, response as never, (err) => { error = err; });
    assert.equal(error, undefined);
    for (const payload of await Promise.all(deliveries)) {
      assert.equal(payload.id, announcement.id);
      assert.equal(payload.createdAt, announcement.createdAt);
      assert.equal(payload.message, announcement.content);
    }
    const adminBarrier = received(admin, 'test:barrier');
    server.to('user:admin').emit('test:barrier');
    await adminBarrier;
    assert.equal(senderNotifications, 0);
  } finally {
    clients.forEach((socket) => socket.disconnect());
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
