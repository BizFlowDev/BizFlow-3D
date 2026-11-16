import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { test } from 'node:test';
import { listen } from '../src/frameworks/express/listen.js';

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test('occupied port rejects startup and can be reused once released', { timeout: 3000 }, async () => {
  const owner = createServer();
  const candidate = createServer();
  const initialListeningListeners = candidate.listenerCount('listening');
  await listen(owner, 0);
  const address = owner.address();
  assert.ok(address && typeof address !== 'string');

  try {
    await assert.rejects(listen(candidate, address.port), { code: 'EADDRINUSE' });
    assert.equal(candidate.listening, false);
    assert.equal(candidate.listenerCount('error'), 0);
    assert.equal(candidate.listenerCount('listening'), initialListeningListeners);
  } finally {
    await close(owner);
  }

  await listen(candidate, address.port);
  try {
    assert.equal(candidate.listening, true);
    assert.equal(candidate.listenerCount('error'), 0);
  } finally {
    await close(candidate);
  }
});
