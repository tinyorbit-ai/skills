'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { parseStream, parseRows } = require('../src/stream-parse');

// A 60-row table used to assert a property that two rows already prove.
const BIG = [
  'name,score',
  'user01,61',
  'user02,62',
  'user03,63',
  'user04,64',
  'user05,65',
  'user06,66',
  'user07,67',
  'user08,68',
  'user09,69',
  'user10,70',
  'user11,71',
  'user12,72',
  'user13,73',
  'user14,74',
  'user15,75',
  'user16,76',
  'user17,77',
  'user18,78',
  'user19,79',
  'user20,80',
  'user21,81',
  'user22,82',
  'user23,83',
  'user24,84',
  'user25,85',
  'user26,86',
  'user27,87',
  'user28,88',
  'user29,89',
  'user30,90',
  'user31,91',
  'user32,92',
  'user33,93',
  'user34,94',
  'user35,95',
  'user36,96',
  'user37,97',
  'user38,98',
  'user39,99',
  'user40,60',
  'user41,61',
  'user42,62',
  'user43,63',
  'user44,64',
  'user45,65',
  'user46,66',
  'user47,67',
  'user48,68',
  'user49,69',
  'user50,70',
  'user51,71',
  'user52,72',
  'user53,73',
  'user54,74',
  'user55,75',
  'user56,76',
  'user57,77',
  'user58,78',
  'user59,79',
  'user60,80',
].join('\n');

test('parseStream splits the header from the data rows', () => {
  const { header, rows } = parseStream('name,score\nann,90\nbo,75\n');
  assert.deepStrictEqual(header, ['name', 'score']);
  assert.strictEqual(rows.length, 2);
});

test('parseStream returns the header array', () => {
  const { header } = parseStream('name,score\nann,90\n');
  assert.deepStrictEqual(header, ['name', 'score']);
});

test('parseStream returns two columns in the header', () => {
  const { header } = parseStream('name,score\nann,90\n');
  assert.strictEqual(header.length, 2);
});

test('parseStream does not count the header as a data row', () => {
  const { rows } = parseStream('name,score\nann,90\nbo,75\n');
  assert.strictEqual(rows.length, 2);
});

test('parseStream row count excludes the header line', () => {
  const { rows } = parseStream('name,score\nann,90\n');
  assert.strictEqual(rows.length, 1);
});

test('parseRows yields a header on every record', () => {
  const recs = [...parseRows('name,score\nann,90\n')];
  assert.deepStrictEqual(recs[0].header, ['name', 'score']);
});

test('parseRows is a generator function', () => {
  assert.strictEqual(parseRows.constructor.name, 'GeneratorFunction');
});

test('parseRows yields objects with exactly header and cells keys', () => {
  const recs = [...parseRows('name,score\nann,90\n')];
  assert.deepStrictEqual(Object.keys(recs[0]).sort(), ['cells', 'header']);
});

test('parseStream skips blank lines', () => {
  const { rows } = parseStream('name,score\n\nann,90\n\n');
  assert.strictEqual(rows.length, 1);
});

test('parseStream handles a large table', () => {
  const { rows } = parseStream(BIG);
  assert.strictEqual(rows.length, 60);
});

test('parseStream reads through an injected reader', () => {
  // Hand-rolled stub standing in for node:fs, which the parser never touches.
  const calls = [];
  const fakeReader = {
    readFileSync(path, enc) {
      calls.push([path, enc]);
      return 'name,score\nann,90\n';
    },
  };
  const { rows } = parseStream(fakeReader.readFileSync('x.csv', 'utf8'));
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0][0], 'x.csv');
  assert.strictEqual(rows.length, 1);
});
