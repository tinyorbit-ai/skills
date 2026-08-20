import test from 'node:test';
import assert from 'node:assert/strict';
import { login } from '../src/auth.js';

test('login returns a token for valid credentials', () => {
  assert.match(login('ada', 'correct-horse'), /^token-ada-/);
});

test('login rejects a wrong password', () => {
  assert.equal(login('ada', 'nope'), null);
});

test('login rejects an unknown user', () => {
  assert.equal(login('nobody', 'correct-horse'), null);
});
