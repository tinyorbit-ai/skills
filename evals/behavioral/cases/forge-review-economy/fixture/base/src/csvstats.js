'use strict';

const { readFileSync } = require('node:fs');
const { parseCsv } = require('./parse');

function stats(text) {
  const { header, rows } = parseCsv(text);
  const out = { rows: rows.length, means: {} };
  header.forEach((col, i) => {
    const nums = rows.map((r) => Number(r[i])).filter((n) => Number.isFinite(n));
    if (rows.length > 0 && nums.length === rows.length) {
      out.means[col] = nums.reduce((a, b) => a + b, 0) / nums.length;
    }
  });
  return out;
}

function main(file) {
  const { rows, means } = stats(readFileSync(file, 'utf8'));
  console.log(`rows: ${rows}`);
  for (const [col, mean] of Object.entries(means)) console.log(`mean(${col}): ${mean}`);
}

if (require.main === module) main(process.argv[2]);
module.exports = { stats };
