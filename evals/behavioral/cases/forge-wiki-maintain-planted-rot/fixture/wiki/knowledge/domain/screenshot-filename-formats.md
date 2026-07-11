---
title: "macOS screenshot filename formats by locale"
compiled: 2026-06-22
sources:
  - "research notes"
quality: synthesized
tags: [domain]
---

# macOS screenshot filename formats by locale

## Core Concept

The default macOS screenshot filename embeds a timestamp, but its exact shape
depends on system locale and the "Screen Shot" vs "Screenshot" rename that landed
in Monterey. Parsers need at least three patterns: `Screen Shot 2026-05-04 at
09.12.31`, `Screenshot 2026-05-04 at 09.12.31`, and the 24h/12h clock variants.

## Key Points

- Users who changed the default save name break filename-based extraction entirely
  — which is why it ranks below EXIF.
- The date separator differs by locale (`.` vs `:` in the time part).

## Related

- [[date-extraction-sources]]
