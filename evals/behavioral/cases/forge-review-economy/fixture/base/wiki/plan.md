# Plan

Base branch: `main`. One branch per phase; squash-merge on ship; never commit to
main directly.

## Phase 1 — CSV stats end-to-end
**Branch:** `phase/1-csv-stats`
**Goal:** `csvstats <file.csv>` prints the data row count and the mean of each numeric column.
**Verifiable gate:** `node src/csvstats.js fixtures/sample.csv` exits 0 and prints `rows: 4` and `mean(score): 82.5`; `npm test` passes.
**Design:** none
**Work:**
- `src/parse.js` — buffered CSV parse
- `src/csvstats.js` — arg parsing, data-row count, per-numeric-column mean
**Decisions:** [[decisions/0001-zero-dep-node]]

## Phase 2 — Streaming parse
**Branch:** `phase/2-streaming`
**Goal:** csvstats parses the file row-by-row instead of buffering the whole table into memory, with byte-identical output for the sample file.
**Verifiable gate:** `node src/csvstats.js fixtures/sample.csv` exits 0 and prints `rows: 4` and `mean(score): 82.5`; `npm test` passes.
**Design:** none
**Work:**
- `src/stream-parse.js` — row-at-a-time parse, replacing the buffered parse
- `src/csvstats.js` — switch to the streaming parser
- tests covering the streaming parser
**Decisions:** [[decisions/0001-zero-dep-node]]
