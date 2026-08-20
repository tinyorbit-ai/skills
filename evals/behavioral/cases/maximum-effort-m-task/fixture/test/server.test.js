import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

async function withServer(fn) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const post = (base, body) => fetch(`${base}/login`, { method: 'POST', body: JSON.stringify(body) });

test('GET /health is ok', () => withServer(async (base) => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
}));

test('POST /login returns 200 and a token for valid credentials', () => withServer(async (base) => {
  const res = await post(base, { username: 'ada', password: 'correct-horse' });
  assert.equal(res.status, 200);
  assert.match((await res.json()).token, /^token-ada-/);
}));

test('POST /login returns 401 for a wrong password', () => withServer(async (base) => {
  const res = await post(base, { username: 'ada', password: 'nope' });
  assert.equal(res.status, 401);
}));

test('POST /login returns 400 for malformed json', () => withServer(async (base) => {
  const res = await fetch(`${base}/login`, { method: 'POST', body: '{nope' });
  assert.equal(res.status, 400);
}));
