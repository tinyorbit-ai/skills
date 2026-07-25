'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { readFileSync } = require('node:fs');
const { stats } = require('../src/csvstats');

test('counts data rows and means the numeric column', () => {
  const out = stats(readFileSync('fixtures/sample.csv', 'utf8'));
  assert.strictEqual(out.rows, 4);
  assert.strictEqual(out.means.score, 82.5);
});
