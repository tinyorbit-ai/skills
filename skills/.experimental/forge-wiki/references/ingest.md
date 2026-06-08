# forge-wiki — ingest reference

The full quality filter, matching, and merge rules for turning a source into a living
article under `wiki/knowledge/`. The article format and Timeline verbs are defined in
the forge orchestrator's `references/wiki.md`; this file is the *procedure*.

Ingest is **always plan-first** — everything below runs in your head and is shown to
the user as a plan; nothing is written until they approve.

## Step 1 — Read the source

A source can be: pasted text, a file path (inside or outside the repo), an exported
email/thread, or a named conversation ("the call with the client today"). Read it in
full. Record where it came from for the `sources:` frontmatter:

- A file → its path relative to the repo root.
- An email/thread → a short stable label (`email/2026-06-01-client-thread`); if the
  raw export should be kept, save it under `wiki/knowledge/_sources/` and cite that.
- A live conversation → the literal token `conversation` plus the date.

## Step 2 — Quality filter (disposition)

Pick exactly one disposition:

**Article-worthy** (becomes or updates an article):
- Has clear structure and ≥2 concrete points (numbers, names, decisions, constraints).
- Carries context the build should honor (a deadline driver, a user behaviour, a
  competitive stance, a business constraint, a domain fact).

**Timeline-only** (append evidence to an existing article, never anchor a new one):
- A single thread, quote, podcast note, or article that reinforces or lightly refines
  something already captured but isn't structured enough to stand alone.
- ALWAYS routes through MERGE (Step 3). If no matching article exists, **downgrade to
  skip** and say so in the plan — don't manufacture a thin article.

**Skip** (write nothing, log the reason):
- < ~20 lines of real content, a stub, a bare link + teaser, or a pure link dump with
  no analysis.

When the call is genuinely borderline (could be substantive or could be a stub),
surface it in the plan with the first few lines and your recommendation, and let the
user decide.

## Step 3 — Match: NEW vs MERGE

1. **Pick the candidate topic by content fit.** Anti-sprawl: grep
   `wiki/knowledge/INDEX.md` for a near-synonym topic first and reuse the canonical
   name. Create a new top-level topic only if nothing fits. Flat — never a subfolder.
   A lone article doesn't earn its own topic; route to nearest-fit until ~3+ cluster.
2. **Look for an existing article.** Grep the topic for a similar filename stem; if
   none, read the topic `_index.md` summaries for one that covers the same concept
   under a different name.
3. Result is **NEW** (nothing covers it) or **MERGE** (one does).

## Step 4 — Classify a MERGE

Against the existing article's Core Concept, the new source is exactly one of:

- **Reinforced** — same conclusion, new angle or example. Core Concept untouched.
- **Refined** — adds nuance, a caveat, or a scope condition. Core Concept updated.
- **Contradicted** — disagrees with the prior framing. Core Concept rewritten —
  **only after user confirmation, showing the diff.** High-stakes; never auto-apply.
- **Orthogonal** — actually a different concept. Fall back to NEW.

Quality gate for changing Core Concept (Refined/Contradicted): the source must be
solid — concrete, sourced, structured. Timeline-only quality (a podcast, a passing
note) defaults to **Reinforced** and never rewrites Core Concept.

## Step 5 — Write (only after approval)

**NEW** — write the full article per the format in `references/wiki.md`:
frontmatter (`title`, `compiled`=today, `last_evidence`=today, `sources`, `quality`,
`tags`), `> **Summary:**`, `## Core Concept`, `## Key Points`, `## Related`
(`[[wikilinks]]`), `## Timeline` with one `Compiled` entry. Clean up raw notes into
polished prose; preserve every specific (numbers, names, examples). ≥ ~30 lines of
real content or it should have been Timeline-only.

**MERGE** — do NOT overwrite:
1. Append a Timeline entry with the right verb and a one-line note + the source.
2. Update Core Concept only for Refined/Contradicted that clears the quality bar.
3. Append the source path to `sources:` (don't replace).
4. Bump `last_evidence` to today; leave `compiled` at its original value.

## Step 6 — Log + index

- Append a row to `wiki/knowledge/_compilation-log.md`:
  `| date | source | action | article | verb | quality | reason |`
  where action ∈ `ingested-new` | `ingested-timeline` | `skipped`.
- Add NEW articles to their topic `_index.md`; ensure reachable from
  `wiki/index.md → [[knowledge/INDEX]]`. Either update indexes inline or note that
  `forge-wiki-maintain` should run to regenerate them.

## Batch ingests

When several sources arrive at once (a folder, a thread dump), run Steps 1–4 for all
of them and present **one consolidated plan** (a table of disposition + NEW/MERGE +
target per source) before writing anything. After writing, recommend
`forge-wiki-maintain` to regenerate indexes and check links in one pass.
