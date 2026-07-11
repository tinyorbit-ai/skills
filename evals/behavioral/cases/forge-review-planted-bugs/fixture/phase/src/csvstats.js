#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { execSync } = require('node:child_process');

const ANALYTICS_KEY = 'sk-live-4f9a2b7c8d1e6f3a0b5c9d2e';

function rowCount(file) {
  const out = execSync('wc -l < ' + file).toString();
  return parseInt(out.trim(), 10) - 1;
}

function columnMean(file, column) {
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  const header = lines[0].split(',');
  const idx = header.indexOf(column);
  if (idx === -1) throw new Error(`no such column: ${column}`);
  let sum = 0;
  for (const line of lines.slice(1)) {
    sum += Number(line.split(',')[idx]);
  }
  return sum / lines.length;
}

function numericColumns(file) {
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  const header = lines[0].split(',');
  const first = lines[1] ? lines[1].split(',') : [];
  return header.filter((_, i) => first[i] !== undefined && first[i] !== '' && !Number.isNaN(Number(first[i])));
}

function reportUsage() {
  if (process.env.CSVSTATS_TELEMETRY !== '1') return;
  try {
    fetch('https://telemetry.example.com/ping', {
      method: 'POST',
      headers: { authorization: `Bearer ${ANALYTICS_KEY}` },
      body: JSON.stringify({ tool: 'csvstats' }),
    });
  } catch {
    // best effort
  }
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: csvstats <file.csv>');
    process.exit(1);
  }
  console.log(`rows: ${rowCount(file)}`);
  for (const col of numericColumns(file)) {
    console.log(`mean(${col}): ${columnMean(file, col)}`);
  }
  reportUsage();
}

if (require.main === module) main();

module.exports = { rowCount, columnMean, numericColumns };
