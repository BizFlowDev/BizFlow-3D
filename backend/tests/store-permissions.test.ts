import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../src/config/index.js';
import { controllers } from '../src/config/diContainer.js';
import storeRoutes from '../src/frameworks/express/routes/storeRoutes.js';
import { errorHandler } from '../src/adapters/middleware/errorHandler.js';

const app = express();
app.use(express.json());
app.use('/stores', storeRoutes);
app.use(errorHandler);

const token = (role: string) => jwt.sign({ userId: 'test-user', storeId: 'test-store', role }, env.JWT_SECRET, { expiresIn: '1m' });

test('employee store reads remain available but management writes stop before any business operation', async (t) => {
  const find = mock.method(controllers.storeRepo, 'findById', async () => ({ id: 'test-store', name: 'Test store' }));
  const update = mock.method(controllers.storeRepo, 'update', async () => { throw new Error('Unexpected store write'); });
  const upgrade = mock.method(controllers.manageStoreSubscriptionUseCase, 'execute', async () => { throw new Error('Unexpected upgrade'); });
  const stripe = mock.method(controllers.createStripeUpgradeSessionUseCase, 'execute', async () => { throw new Error('Unexpected Stripe session'); });
  t.after(() => mock.restoreAll());

  await request(app).get('/stores/me').set('Authorization', `Bearer ${token('employee')}`).expect(200);
  assert.equal(find.mock.callCount(), 1);

  for (const [method, path] of [['put', '/profile'], ['put', '/bank-info'], ['post', '/upgrade-subscription'], ['post', '/upgrade-session/stripe']] as const) {
    await request(app)[method](`/stores${path}`).set('Authorization', `Bearer ${token('employee')}`).send({}).expect(403);
  }
  assert.equal(update.mock.callCount(), 0);
  assert.equal(upgrade.mock.callCount(), 0);
  assert.equal(stripe.mock.callCount(), 0);
  assert.equal(find.mock.callCount(), 1);
});

test('owners retain store profile editing and unauthenticated writes fail', async (t) => {
  const update = mock.method(controllers.storeRepo, 'update', async () => ({ id: 'test-store', name: 'Updated' }));
  t.after(() => mock.restoreAll());
  await request(app).put('/stores/profile').send({ name: 'Updated' }).expect(401);
  await request(app).put('/stores/profile').set('Authorization', `Bearer ${token('owner')}`).send({ name: 'Updated' }).expect(200);
  assert.equal(update.mock.callCount(), 1);
});
