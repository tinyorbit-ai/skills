'use strict';

// Streaming parse: yields one record at a time so a large file never lands in
// memory as a single table. Replaces the buffered parse in src/parse.js.
function* parseRows(text) {
  let header = null;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cells = trimmed.split(',');
    if (header === null) {
      header = cells;
      continue;
    }
    yield { header, cells };
  }
}

function parseStream(text) {
  const rows = [];
  let header = [];
  for (const rec of parseRows(text)) {
    header = rec.header;
    rows.push(rec.cells);
  }
  return { header, rows };
}

module.exports = { parseStream, parseRows };
