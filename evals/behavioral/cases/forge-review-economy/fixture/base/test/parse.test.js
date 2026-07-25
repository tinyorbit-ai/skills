'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseCsv } = require('../src/parse');

test('parseCsv splits header from data rows', () => {
  const { header, rows } = parseCsv('name,score\nann,90\nbo,75\n');
  assert.deepStrictEqual(header, ['name', 'score']);
  assert.strictEqual(rows.length, 2);
});

test('parseCsv tolerates a trailing newline', () => {
  const { rows } = parseCsv('name,score\nann,90\n');
  assert.strictEqual(rows.length, 1);
});
