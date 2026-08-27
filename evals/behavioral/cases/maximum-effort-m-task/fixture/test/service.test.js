import test from 'node:test';
import assert from 'node:assert/strict';
import { SERVICE_ID, healthStatus } from '../src/service.js';

test('health status uses the service identifier', () => {
  assert.equal(SERVICE_ID, 'orbit-core');
  assert.deepEqual(healthStatus(), { ok: true, service: 'orbit-core' });
});
