# Brief — tidyshots

> Compiled by forge-discovery. Locked. (Eval fixture — a realistic small brief.)

## What we're building

`tidyshots` — a CLI that tidies a screenshots folder: moves every screenshot into
`YYYY-MM/` subfolders by capture date, renames to `YYYY-MM-DD-HHMMSS-<slug>.png`,
detects byte-identical duplicates and quarantines them in `_dupes/`, and supports
`--dry-run` that prints the full move plan without touching anything.

## Who & when

Me (Matt). Run manually every couple of weeks when `~/Desktop/screenshots` passes
~200 loose files and finding anything becomes scrolling archaeology.

## How it should feel

One command, instant trust. The dry-run output should read like a receipt — clear
enough that running it for real feels safe. No config file, no prompts.

## The hard part

Capture-date extraction that doesn't lie: prefer EXIF/file metadata, fall back to
the macOS screenshot filename pattern (`Screen Shot 2026-05-04 at 09.12.31`), fall
back to file mtime — and be honest in the output about which source was used per
file, because a wrong date silently files a screenshot where it will never be found.

## Constraints

- Node, zero runtime dependencies (this machine already has Node 22; no Python).
- Never delete anything — duplicates are moved to `_dupes/`, not removed.
- Idempotent: running twice in a row is a no-op the second time.
- Must handle 2,000 files in under 10 seconds.

## Non-goals

- No OCR, tagging, or content search.
- No GUI, no menu-bar app, no watching the folder — manual invocation only.
- No cloud sync awareness (iCloud conflicts are out of scope).

## Alternatives considered

Hazel (rules feel opaque, and date-source honesty isn't expressible), a Finder
smart folder (organizes views, not files), raw `mv` scripts (no dedupe, no dry-run
receipt). None make the dry-run-as-receipt feel possible.

## Sharpening

- **The specific moment:** pasting a screenshot into a client email and spending
  four minutes finding it among 400 `Screen Shot ….png` files.
- **Smallest useful version:** date-sort into `YYYY-MM/` folders with dry-run;
  rename + dedupe can follow.
- **Ambition check (locked):** the honest-date-source receipt IS the product —
  a mover without it is just another script.
