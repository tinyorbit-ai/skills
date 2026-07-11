---
title: "Date extraction — EXIF beats filename beats mtime"
compiled: 2026-06-18
last_evidence: 2026-06-18
sources:
  - "research notes"
quality: verified
tags: [domain]
---

# Date extraction — EXIF beats filename beats mtime

> **Summary:** EXIF beats filename beats mtime; the receipt must name which source won per file.

## Core Concept

Screenshot capture dates come from three sources of falling reliability: EXIF
metadata (when present), the macOS screenshot filename pattern, and file mtime
(which lies after any copy or sync). The receipt's honesty requirement means the
chosen source is per-file output, not an implementation detail.

## Key Points

- mtime is wrong after iCloud sync, `cp`, and most backup restores.
- The filename pattern varies by macOS locale settings.

## Related

(none yet)

## Timeline

- 2026-06-18 — **Compiled** from research notes. Initial framing.
