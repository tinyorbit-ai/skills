'use strict';

// Buffered parse: reads the whole table into memory, then splits.
function parseCsv(text) {
  const lines = text.trim().split('\n');
  const header = lines[0].split(',');
  const rows = lines.slice(1).map((line) => line.split(','));
  return { header, rows };
}

module.exports = { parseCsv };
