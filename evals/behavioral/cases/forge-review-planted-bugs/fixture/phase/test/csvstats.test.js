'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { columnMean, numericColumns } = require('../src/csvstats.js');

test('columnMean returns a number', () => {
  assert.strictEqual(typeof columnMean('fixtures/sample.csv', 'score'), 'number');
});

test('numericColumns finds score', () => {
  assert.ok(numericColumns('fixtures/sample.csv').includes('score'));
});
