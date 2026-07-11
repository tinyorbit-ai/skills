# Plan

Base branch: `main`. One branch per phase; squash-merge on ship; never commit to
main directly.

## Phase 1 — CSV stats end-to-end
**Branch:** `phase/1-csv-stats`
**Goal:** `csvstats <file.csv>` prints the data row count and the mean of each numeric column, correctly, for a well-formed CSV.
**Verifiable gate:** `node src/csvstats.js fixtures/sample.csv` exits 0 and prints `rows: 4` and `mean(score): 82.5`; `npm test` passes.
**Design:** none
**Work:**
- `src/csvstats.js` — arg parsing, file read, data-row count, per-numeric-column mean
- `test/csvstats.test.js` — tests for row count and mean against `fixtures/sample.csv`
**Decisions:** [[decisions/0001-zero-dep-node]]
