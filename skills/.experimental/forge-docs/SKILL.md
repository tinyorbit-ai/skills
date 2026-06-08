---
name: forge-docs
description: Post-ship documentation drift check using the Diataxis framework (tutorial / how-to / reference / explanation). Reads the project's docs, cross-references the just-landed phase diff, auto-fixes concrete drift (renamed commands, changed signatures, moved env vars), and surfaces structural gaps (new feature with no docs presence) as taste decisions. Auto-invoked by forge-ship when the landed phase touched a documented surface; runs standalone any time the docs feel behind reality. Use when asked to "update docs", "doc drift", "post-ship docs", or "what docs need updating".
metadata:
  internal: true
---

# forge-docs

Closes the gap between what shipped and what the docs claim. Runs after a
phase lands (or any time on demand). Diataxis-aware so it knows which
docs surface a given change belongs in.

## Charter

Docs are part of the craft. Critique the docs, never the premise. The
bar is "the docs match what shipped, in the right Diataxis quadrant" —
never "rank for SEO" or "convert".

## When it runs

- **Auto:** `forge-ship` invokes this after writing the build-log entry
  if the phase diff touched a documented surface (README, `docs/`,
  `--help` text, exported API surface, OpenAPI spec, etc.).
- **Standalone:** invoke any time on demand. Scoped to "since last
  build-log entry" by default; broader on explicit request.

If the project has no docs and no doc directory, say so and exit (offer
`forge-docs --generate` later if `forge-docs-generate` lands).

## Diataxis quadrants (the lens)

Every doc piece belongs in exactly one quadrant. forge-docs uses these to
route changes to the right place.

| Quadrant | What it is | Where it usually lives |
|---|---|---|
| **Tutorial** | Learning-oriented, "here's your first hour" | `docs/tutorial/`, `getting-started.md`, top of README |
| **How-to** | Task-oriented, "here's how to do X" | `docs/how-to/`, recipe folders |
| **Reference** | Information-oriented, exact API/CLI signatures | `docs/reference/`, generated docs, `--help` |
| **Explanation** | Understanding-oriented, "here's why" | `docs/explanation/`, ADRs, architecture docs |

## Process

### 1. Build the coverage map

Scan the project's doc surface (README, `docs/`, `--help` output if
applicable, any `*.md` outside `wiki/` and `node_modules/`). Classify
each piece by Diataxis quadrant. Note what's missing entirely.

### 2. Cross-reference the diff

`git diff <prev-shipped>...HEAD` — typically the just-landed phase's
squashed commit on the base branch (or the user-named range).

For each changed surface, decide:

- **Concrete drift** — a doc names a command, flag, signature, env var,
  or file path that changed. The doc is now wrong.
- **Structural gap** — the change introduced a new feature with no docs
  presence at all in the right quadrant. (A new CLI command with no
  `--help` entry; a new public API with no reference page.)
- **No-op** — the change was internal; docs unaffected.

### 3. Fix policy

- **Concrete drift → fix automatically.** Update the command, signature,
  env var, path. Show the diff per file in the report. Don't ask
  permission to fix something objectively wrong.
- **Structural gap → surface as taste decision.** Which quadrant should
  the new feature land in? Often more than one (tutorial + reference).
  Decision Brief shape (forge suite's `references/question-style.md`).
  The user picks; you write the stub in the chosen location.
- **Doc that no longer makes sense (covered feature deleted)** → fix
  automatically (remove or mark deprecated).

### 4. Update `wiki/` cross-links

- If an ADR was the source of the change, link the doc page to the ADR.
- If a learning was the source ("we changed the flag name because of a
  past bug"), link the learning.
- Update `wiki/index.md` if any new docs file was added.

### 5. Report

```
forge-docs
  Diff scope: <range>
  Concrete drift fixed: <N>   (files: <list>)
  Structural gaps surfaced: <N>
  Quadrant coverage map: T:<n> H:<n> R:<n> E:<n>
  wiki cross-links added: <N>
```

Tell the user every file changed, in the same turn.

## Rules

- Auto-fix concrete drift; surface only structural taste calls.
- Diataxis quadrant is mandatory for any new doc stub — never write a
  doc page without naming its quadrant.
- Never invent content for a feature you don't fully understand from the
  diff. If the diff is unclear, ask (Decision Brief) — don't hallucinate.
- Charter-safe: docs serve the developer, not SEO or marketing.
- Stay on the current branch (typically the base, post-ship); never push.

## References

- forge suite's `references/question-style.md` — Decision Brief format
- Diataxis framework: https://diataxis.fr — for the quadrant lens
