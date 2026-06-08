---
name: forge-wiki-maintain
description: Keep the project wiki healthy — regenerate every index from current state (wiki/index.md, wiki/knowledge/INDEX.md, per-topic _index.md) and run health checks (orphaned articles, broken [[wikilinks]], missing summaries/frontmatter, stale evidence, duplicate coverage, oversized topics, flat-invariant violations). Outputs wiki/knowledge/_health-report.md. Use after a batch of forge-wiki ingests, when indexes feel out of date, when links break, or when asked to "regenerate the wiki index", "wiki health", "check the wiki", or "tidy the wiki".
metadata:
  internal: true
---

# forge-wiki-maintain

The wiki's janitor. Two jobs: **regenerate indexes** so navigation never drifts, and
**health-check** the knowledge base. The wiki layout and article format live in the
forge orchestrator's `references/wiki.md`; the full check list is in
`references/health.md`.

## Routing

- "regenerate / rebuild the index", post-ingest tidy → **INDEX**.
- "wiki health / check the wiki / find broken links" → **HEALTH** (which ends by
  running INDEX when `--fix`).
- No argument → run HEALTH (report-only), then offer INDEX + fixes.

If `wiki/` doesn't exist, there's nothing to maintain — say so and point at
`forge-init`.

## INDEX — full regeneration (no drift)

Regenerate from the actual files on disk, every time:

1. **Per-topic `_index.md`** — for each folder under `wiki/knowledge/`, list every
   article (excluding `_index.md`) as `- [[slug]] — <Summary line>`, sorted by
   filename. Header: `# <Topic> | Articles: <n>` + last-updated date. Pull the
   `> **Summary:**` line from each article (fall back to the first Core Concept
   sentence). Links are bare `[[slug]]` wikilinks — no `.md`, no path.
2. **`wiki/knowledge/INDEX.md`** — topic directory table (`| Topic | Articles |
   Index |` with `[[<topic>/_index]]` path-qualified links, since `_index` basenames
   repeat) + a quick-lookup of the top articles per topic (bare `[[slug]]`).
3. **`wiki/index.md`** — ensure the map of content links every project-record file and
   has a "Knowledge base" section pointing at `[[knowledge/INDEX]]`. Don't clobber
   hand-written reading-order prose; update the links and counts.

All links Obsidian-style. Never emit a plain `path.md:` or single-bracket `[file.md]`
— those aren't clickable in Obsidian.

## HEALTH — checks

Run the checks in `references/health.md` and write `wiki/knowledge/_health-report.md`.
Headline categories: orphans, index accuracy, missing summaries, missing frontmatter,
broken `[[wikilinks]]`, duplicate coverage, stubs, stale evidence (`last_evidence`
> ~180 days), bloated/again broken Timelines, oversized+heterogeneous topics (split
candidates), near-duplicate topic names, and flat-invariant violations (nested
subfolders).

- **`--fix`** auto-fixes the safe ones: regenerate all indexes, add missing Summary
  lines (read the article, write a specific one), add a missing `## Timeline` with a
  retroactive `Compiled` entry.
- Everything structural (duplicates to merge, broken cross-refs, topic splits/merges,
  re-homing nested folders) is **reported, never auto-applied** — those are taste or
  data-integrity calls for the user.

## Report

Tell the user: topics, total articles, issues found (by category), what `--fix`
changed, and what still needs a human decision.

## Rules

- Full regeneration, not incremental patching — indexes must match disk exactly.
- Obsidian `[[wikilink]]` syntax everywhere; flat taxonomy is an invariant.
- Never delete or merge articles on your own — surface the candidates and let the
  user decide.
