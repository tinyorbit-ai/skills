# forge-wiki-maintain — health reference

The full check list. Scope is `wiki/` with a focus on `wiki/knowledge/`. Write results
to `wiki/knowledge/_health-report.md`. Each check is report-only unless marked
auto-fixable and `--fix` was passed.

## Checks

1. **Orphan detection.** Glob every article under `wiki/knowledge/<topic>/`
   (excluding `_index.md`, `INDEX.md`, `_*.md`). Flag any not listed in its topic's
   `_index.md`. *Auto-fixable* (regenerate index).
2. **Index accuracy.** For each topic `_index.md`, compare listed articles to the
   files present. Flag entries pointing at missing files, and header counts that don't
   match reality. *Auto-fixable.*
3. **Missing summaries.** Scan the whole file for the `> **Summary:**` line (it sits
   after the `# Title`, can be well past the frontmatter). Flag any article missing
   it. *Auto-fixable* — read the article, write a specific one-liner (with a number,
   name, or concrete insight; never "Overview of X").
4. **Missing frontmatter.** Flag articles missing any of `title`, `compiled`,
   `sources`, `quality`, `tags`. *Report.*
5. **Broken cross-references.** Grep all articles for `[[…]]`. For each, check the
   target resolves to an existing wiki file (by slug across `knowledge/`, or a
   project-record path). Flag broken links. *Report* (fixing means deciding intent).
6. **Duplicate coverage.** Compare filenames and Summary lines across topics; flag
   pairs with near-identical names or overlapping concepts. *Report* — merging is a
   user call.
7. **Stubs.** Flag articles with < ~12 lines of real content (excluding frontmatter /
   Timeline) as "expand or delete". *Report.*
8. **Generic summaries.** Flag Summary lines starting with "Overview of" / "Root
   index for" / lacking any specific. *Report* (or *auto-fix* by rewriting under
   `--fix`).
9. **Missing Timeline.** Grep each article for `## Timeline`. Flag any without one.
   *Auto-fixable* — append `- <compiled date> — **Compiled** from \`<first source>\`.
   Initial framing.`
10. **Stale evidence.** Read `last_evidence` (fall back to `compiled`). Flag any more
    than ~180 days before today as "confirm Core Concept still holds or add a
    Reinforced entry". *Report only.*
11. **Bloated Timeline.** Flag articles with > ~20 Timeline entries: "consider
    archiving oldest into a `## Timeline (Archived)` section". *Report only.*
12. **Broken Timeline sources.** Parse source paths from Timeline entries (in
    backticks). For each that points inside the repo, check it exists. Flag broken
    ones with the article + offending entry. External URLs and `conversation` markers
    aren't validated. *Report.*
13. **Oversized + heterogeneous topic (split candidate).** A topic is a candidate
    ONLY if it has > ~150 articles AND visibly holds ≥2 self-contained sub-domains.
    Size alone is never a flag — a big coherent topic is healthy. For a real
    candidate, read its `_index.md` and propose 2–4 sibling top-level topics.
    *Advisory — user-approved, never auto-split.*
14. **Near-duplicate topic names.** Flag topic-folder pairs that are synonyms or
    domain-overlapping; recommend the canonical name to keep. *Report.*
15. **Flat-invariant violation.** Glob for any nested subfolder
    (`wiki/knowledge/*/*/`). Flag every one as a policy violation — the knowledge base
    is flat, one level. *Report* — do NOT auto-move (moves must preserve link/index
    integrity); list them for the user to re-home.

## Report format

```markdown
# Wiki Health Report
Generated: <date>

## Summary
- Topics: <n> · Articles: <n> · Issues: <n> · Auto-fixed: <n>

## Issues
### Orphaned articles
### Broken index references
### Missing summaries
### Missing frontmatter
### Broken cross-references
### Duplicate coverage
### Stubs
### Stale evidence
### Timeline health (missing / bloated / broken sources)
### Taxonomy (split candidates / near-duplicate topics / flat violations)
```

## Fix policy

With `--fix`: regenerate all indexes (Checks 1–2), add missing summaries (3), add
missing Timelines (9), rewrite generic summaries (8). Report everything else for a
human decision. Never delete, merge, move, or split on your own.
