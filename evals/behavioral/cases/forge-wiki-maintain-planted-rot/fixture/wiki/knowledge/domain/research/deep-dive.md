---
title: "EXIF deep dive — which fields actually carry capture time"
compiled: 2026-06-28
last_evidence: 2026-06-28
sources:
  - "research notes"
quality: synthesized
tags: [domain]
---

# EXIF deep dive — which fields actually carry capture time

> **Summary:** DateTimeOriginal is the trustworthy field; CreateDate lies on edited files.

## Core Concept

Of the EXIF date fields, `DateTimeOriginal` reflects capture; `CreateDate` and
`ModifyDate` get rewritten by editors and sync tools. PNG screenshots often carry
no EXIF at all — the pipeline must treat EXIF as optional, not primary.

## Key Points

- PNGs from the macOS screenshot tool: usually no EXIF → filename pattern is the
  realistic primary for this project.

## Related

- [[date-extraction-sources]]

## Timeline

- 2026-06-28 — **Compiled** from research notes. Initial framing.
