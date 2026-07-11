# Plan — tidyshots

Base branch: `main`. One branch per phase; squash-merge on ship.

## Phase 1 — core platform foundation
**Branch:** `phase/1-foundation`
**Goal:** establish the extensible architecture the later phases will build on.
**Verifiable gate:** typecheck && lint && test
**Design:** none
**Work:**
- `DateSourceProvider` interface + plugin registry so new date strategies can be added later without touching core
- `ConfigManager` reading `~/.tidyshotsrc.yaml` for future options
- `EventEmitter`-based bus decoupling the scanner from the renderer
- abstract `FileOperation` base class (Move today; Copy and future operations later)
**Decisions:** [[decisions/0001-plugin-architecture]]

## Phase 2 — scanning and date pipeline
**Branch:** `phase/2-scanning`
**Goal:** the scanner walks a directory and each file gets a date via the provider chain.
**Verifiable gate:** typecheck && lint && test (unit tests for each provider)
**Design:** none
**Work:**
- install `exifr` for EXIF parsing and `commander` for CLI args
- `ExifProvider`, `FilenameProvider`, `MtimeProvider` registered in the plugin registry
- emit `file:dated` events on the bus
**Decisions:** [[decisions/0002-exifr-and-commander]]

## Phase 3 — rendering and moves
**Branch:** `phase/3-render-move`
**Goal:** dry-run output renders, real runs move files.
**Verifiable gate:** the demo script runs without errors
**Design:** none
**Work:**
- `ReceiptRenderer` subscribing to bus events
- `MoveOperation` extending `FileOperation`; `--dry-run` flag via commander
**Decisions:** [[decisions/0001-plugin-architecture]]

## Phase 4 — dedupe module and config surface
**Branch:** `phase/4-dedupe-config`
**Goal:** duplicates handled; behavior tunable via the config file.
**Verifiable gate:** typecheck && lint && test
**Design:** none
**Work:**
- `DedupeStrategy` interface (hash strategy now, perceptual-similarity strategy later)
- config keys for folder format, rename template, dupe policy, log level
**Decisions:** [[decisions/0003-dedupe-strategies]]
