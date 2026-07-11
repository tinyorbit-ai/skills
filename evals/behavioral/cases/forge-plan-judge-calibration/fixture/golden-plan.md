# Plan — tidyshots

Base branch: `main`. One branch per phase; squash-merge on ship.

Brief constraints this plan honors: zero-dependency Node, never delete anything,
idempotent re-runs, honest per-file date-source receipt, 2,000 files < 10 s.

## Phase 1 — dry-run receipt end-to-end
**Branch:** `phase/1-dry-run-receipt`
**Goal:** `tidyshots --dry-run <dir>` prints the full move plan with a per-file date-source column.
**Verifiable gate:** `node src/tidyshots.js --dry-run fixtures/shots` exits 0, prints 214 planned moves, and every line names its date source (`exif` | `filename` | `mtime`); mtime-sourced lines carry a ⚠ flag; `fixtures/empty` prints "nothing to do".
**Design:** none
**Work:**
- date extraction: EXIF field read (plain byte parsing, `node:fs` only) → macOS screenshot filename pattern → file mtime, the winning source recorded per file
- receipt renderer: plain stdout table, one line per file
**Decisions:** [[decisions/0001-zero-dep-node]]

## Phase 2 — real moves, never destructive, idempotent
**Branch:** `phase/2-real-moves`
**Goal:** running without `--dry-run` performs exactly the printed plan; a second run is a no-op.
**Verifiable gate:** on a copy of `fixtures/shots`: run once → 214 files land in `YYYY-MM/` folders and exit prints "moved 214"; run again → exit prints "nothing to do" and `find` shows an identical tree; no file was deleted (count before == count after).
**Design:** none
**Work:**
- move executor reuses the phase-1 plan structure (one code path for plan and apply)
- renames to `YYYY-MM-DD-HHMMSS-<slug>.png` with collision suffixing
**Decisions:** [[decisions/0001-zero-dep-node]]

## Phase 3 — duplicate quarantine + the 2k/10s bar
**Branch:** `phase/3-dupes-and-speed`
**Goal:** byte-identical duplicates are moved to `_dupes/` (never deleted), and the whole run meets the brief's speed bar.
**Verifiable gate:** `fixtures/with-dupes` (12 known duplicate pairs) → 12 files land in `_dupes/`, originals untouched; `time node src/tidyshots.js --dry-run fixtures/2k-files` completes < 10 s on the dev machine, output states the timing.
**Design:** none
**Work:**
- content hash (streaming `node:crypto`) only for size-colliding files — avoids hashing all 2,000
- `_dupes/` naming mirrors the original path for reversibility
**Decisions:** [[decisions/0002-hash-on-size-collision]]
